import { ResolverQueue, QueueStat } from './resolver-queue.js';

export class ClosedChanError extends Error {
    constructor() {
        super('Channel is closed');
    }
}

export type Callback<T> = (value: T) => void;

export interface SendOnlyChan<T> {
    send(value: T): Promise<void>;
    close(): Promise<void>;
}

export interface ReceiveOnlyChan<T> {
    [Symbol.asyncIterator](): AsyncIterator<T, void>;
}

export class Chan<T> implements SendOnlyChan<T>, ReceiveOnlyChan<T> {
    private queue: T[] = [];
    private qReaders: ResolverQueue<IteratorResult<T>> = new ResolverQueue();
    private isClosed: boolean = false;
    private qWriters: ResolverQueue<void> = new ResolverQueue();

    constructor(private bufferSize = Infinity) {}

    private _stat: QueueStat = {
        peakLength: 0,
    };

    private countStats() {
        if (this.queue.length > this._stat.peakLength) {
            this._stat.peakLength = this.queue.length;
        }
    }

    async send(value: T) {
        if (this.isClosed) {
            throw new ClosedChanError();
        }

        if (this.queue.length < this.bufferSize) {
            if (this.qReaders.length > 0) {
                this.qReaders.continue({ value, done: false });
            } else {
                this.queue.push(value);
                this.countStats();
            }
        } else {
            // Block the writer until we have room in the queue.
            await this.qWriters.block();
            this.send(value);
        }
    }

    async close() {
        this.isClosed = true;
        // Tell the readers that we're done.
        this.qReaders.continueAll({ value: undefined, done: true });
    }

    get stat(): {
        readers: Readonly<QueueStat>;
        writers: Readonly<QueueStat>;
        data: Readonly<QueueStat>;
    } {
        return {
            readers: this.qReaders.stat,
            writers: this.qWriters.stat,
            data: this._stat,
        };
    }

    async recv(): Promise<T> {
        const iter = this[Symbol.asyncIterator]();

        const { value, done } = await iter.next();
        if (done) {
            throw new ClosedChanError();
        }
        return value;
    }

    [Symbol.asyncIterator](): AsyncIterator<T> {
        return {
            next: async () => {
                if (this.queue.length > 0) {
                    const value = this.queue.shift() as T;
                    if (this.qWriters.length > 0) {
                        this.qWriters.continue();
                    }
                    return { value, done: false };
                } else if (this.isClosed) {
                    // Tell a reader that we're done.
                    return { value: undefined, done: true };
                } else {
                    // Block the reader until we have data.
                    return this.qReaders.block();
                }
            },
        };
    }
}
