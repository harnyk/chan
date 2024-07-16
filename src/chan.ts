import { QueueStat, ResolverQueue } from './resolver-queue';

type Maybe<T> = Just<T> | Nothing;

type Just<T> = readonly [T, true];
type Nothing = readonly [undefined, false];
function just<T>(value: T): Just<T> {
    return [value, true];
}
function nothing(): Nothing {
    return [undefined, false];
}
function isJust<T>(value: Maybe<T>): value is Just<T> {
    return value[1];
}
function isNothing<T>(value: Maybe<T>): value is Nothing {
    return !value[1];
}
function valueOf<T>(value: Just<T>): T {
    return value[0];
}

export class ClosedChanError extends Error {
    constructor() {
        super('chan is closed');
    }
}

export class Chan<T> {
    protected sendQueue = new ResolverQueue<void>();
    protected recvQueue = new ResolverQueue<Maybe<T>>();
    protected buffer: T[] = [];
    protected closed = false;

    constructor(protected capacity: number = 0) {}

    async send(value: T): Promise<void> {
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
            await this.sendQueue.block();
            // Recursively try to send the value again after unblocking
            return this.send(value);
        }
    }

    async recv(): Promise<Maybe<T>> {
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
            return await this.recvQueue.block();
        }
    }

    async close(): Promise<void> {
        this.closed = true;
        this.recvQueue.continueAll(nothing());
    }

    async *range(): AsyncIterableIterator<T> {
        while (true) {
            const result = await this.recv();
            if (isNothing(result)) {
                break;
            }

            yield valueOf(result);
        }
    }

    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
        return this.range();
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
