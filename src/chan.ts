import { Maybe, isNothing, just, nothing, valueOf } from './maybe.js';
import { QueueStat, ResolverQueue } from './resolver-queue.js';

export interface RecvChan<T> {
    recv(signal?: AbortSignal): Promise<Maybe<T>>;
    canRecvImmediately(): boolean;
    [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}

export interface SendChan<T> {
    send(value: T, signal?: AbortSignal): Promise<void>;
    canSendImmediately(): boolean;
    close(): void;
}

export class ClosedChanError extends Error {
    constructor() {
        super('chan is closed');
    }
}

export class Chan<T> implements SendChan<T>, RecvChan<T> {
    protected sendQueue = new ResolverQueue<void>();
    protected recvQueue = new ResolverQueue<Maybe<T>>();
    protected buffer: T[] = [];
    protected closed = false;

    constructor(protected capacity: number = 0) {}

    async send(value: T, signal?: AbortSignal): Promise<void> {
        if (this.closed) {
            throw new ClosedChanError();
        }

        // If there are waiting receivers, send the value immediately
        if (this.recvQueue.length > 0) {
            this.recvQueue.continue(just(value));
        } else if (this.capacity > 0 && this.buffer.length < this.capacity) {
            // If the buffer is not full, add the value to the buffer
            this.buffer.push(value);
            this.#countStat();
        } else {
            // If the buffer is full or has zero capacity, block the sender until space is available
            await this.sendQueue.block(signal);
            // Recursively try to send the value again after unblocking
            return this.send(value, signal);
        }
    }

    async recv(signal?: AbortSignal): Promise<Maybe<T>> {
        if (this.buffer.length > 0) {
            const value = this.buffer.shift()!;
            if (this.sendQueue.length > 0) {
                this.sendQueue.continue();
            }
            return just(value);
        } else if (this.closed) {
            return nothing();
        } else {
            // If there are waiting senders, notify them
            if (this.sendQueue.length > 0) {
                this.sendQueue.continue();
            }
            return await this.recvQueue.block(signal);
        }
    }

    canSendImmediately(): boolean {
        return (
            this.recvQueue.length > 0 ||
            (this.capacity > 0 && this.buffer.length < this.capacity)
        );
    }

    canRecvImmediately(): boolean {
        return (
            this.closed || this.sendQueue.length > 0 || this.buffer.length > 0
        );
    }

    close(): void {
        this.closed = true;
        this.recvQueue.continueAll(nothing());
    }

    async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
        while (true) {
            const result = await this.recv();
            if (isNothing(result)) {
                break;
            }

            yield valueOf(result);
        }
    }

    #countStat() {
        this.#stat.peakLength = Math.max(
            this.#stat.peakLength,
            this.buffer.length
        );
    }

    #stat: QueueStat = {
        peakLength: 0,
    };

    get stat() {
        return {
            data: this.#stat,
            writers: this.sendQueue.stat,
            readers: this.recvQueue.stat,
        };
    }
}
