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
    #queue: T[] = [];
    #isClosed: boolean = false;

    #qReaders: ResolverQueue<IteratorResult<T>> = new ResolverQueue();
    #qWriters: ResolverQueue<void> = new ResolverQueue();

    #_stat: QueueStat = {
        peakLength: 0,
    };

    constructor(private bufferSize = Infinity) {}

    protected async _readySend(): Promise<void> {
        if (this.#isClosed) {
            throw new ClosedChanError();
        }
        if (this.#queue.length < this.bufferSize) {
            return;
        } else {
            return this.#qWriters.block();
        }
    }

    protected _sendSync(value: T): boolean {
        if (this.#isClosed) {
            return false;
        }

        if (this.#qReaders.length > 0) {
            this.#qReaders.continue({ value, done: false });
        } else {
            this.#queue.push(value);
            this.#countStats();
        }
        return true;
    }

    async send(value: T) {
        await this._readySend();
        if (!this._sendSync(value)) {
            throw new ClosedChanError();
        }
    }

    async close() {
        this.#isClosed = true;
        // Tell the readers that we're done.
        this.#qReaders.continueAll({ value: undefined, done: true });
    }

    get stat(): {
        readers: Readonly<QueueStat>;
        writers: Readonly<QueueStat>;
        data: Readonly<QueueStat>;
    } {
        return {
            readers: this.#qReaders.stat,
            writers: this.#qWriters.stat,
            data: this.#_stat,
        };
    }

    async recv(): Promise<[value: T, ok: true] | [undefined, false]> {
        if (this.#queue.length > 0) {
            const value = this.#queue.shift() as T;
            this.#qWriters.continue();
            return [value, true];
        } else if (this.#isClosed) {
            // Tell a reader that we're done.
            return [undefined, false];
        } else {
            // Block the reader until we have data.
            const value = await this.#qReaders.block();
            return [value.value, true];
        }
    }

    [Symbol.asyncIterator](): AsyncIterator<T> {
        return {
            next: async () => {
                return this.#next();
            },
        };
    }

    async #next(): Promise<IteratorResult<T, any>> {
        if (this.#queue.length > 0) {
            const value = this.#queue.shift() as T;
            this.#qWriters.continue();
            return { value, done: false };
        } else if (this.#isClosed) {
            // Tell a reader that we're done.
            return { value: undefined, done: true };
        } else {
            // Block the reader until we have data.
            return this.#qReaders.block();
        }
    }

    #countStats() {
        if (this.#queue.length > this.#_stat.peakLength) {
            this.#_stat.peakLength = this.#queue.length;
        }
    }
}
