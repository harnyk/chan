import {
    RecvChannelClosed,
    RecvResultInQueue,
    SelectAPI,
} from './private-symbols.js';
import { ResolverQueue, QueueStat, BlockOptions } from './resolver-queue.js';

export interface ChanSelectAPI<T> {
    readyRecv(
        blockOptions?: BlockOptions
    ): Promise<typeof RecvResultInQueue | typeof RecvChannelClosed | Maybe<T>>;
    readySend(blockOptions?: BlockOptions): Promise<void>;
    recvSync(): Maybe<T>;
    sendSync(value: T): boolean;
}
export type Nothing = readonly [undefined, false];
export type Just<T> = readonly [value: T, ok: true];
export type Maybe<T> = Just<T> | Nothing;
function nothing() {
    return [undefined, false] as const;
}
function just<T>(value: T) {
    return [value, true] as const;
}

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

    #isBufferless() {
        return this.bufferSize === 0;
    }

    protected async _readySend(blockOptions?: BlockOptions): Promise<void> {
        if (this.#isClosed) {
            throw new ClosedChanError();
        }
        if (this.#queue.length < this.bufferSize) {
            return;
        } else {
            return this.#qWriters.block(blockOptions);
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

    async #readyRecv(
        blockOptions?: BlockOptions
    ): Promise<typeof RecvResultInQueue | typeof RecvChannelClosed | Maybe<T>> {
        if (this.#queue.length > 0) {
            return RecvResultInQueue;
        } else if (this.#isClosed) {
            return RecvChannelClosed;
        } else {
            const iterResult = await this.#qReaders.block(blockOptions);
            if (iterResult.done) {
                return nothing();
            } else {
                return just(iterResult.value);
            }
        }
    }

    #recvSync(): Maybe<T> {
        if (this.#queue.length > 0) {
            const value = this.#queue.shift() as T;
            if (this.#qWriters.length > 0) {
                this.#qWriters.continue();
            }
            return just(value);
        } else if (this.#isClosed) {
            return nothing();
        } else {
            return nothing();
        }
    }

    async recv(): Promise<Maybe<T>> {
        const maybeResult = await this.#readyRecv();

        switch (maybeResult) {
            case RecvChannelClosed:
                return nothing();
            case RecvResultInQueue:
                return this.#recvSync();
            default:
                return maybeResult;
        }
    }

    [Symbol.asyncIterator](): AsyncIterator<T> {
        return {
            next: async () => {
                return this.#next();
            },
        };
    }

    [SelectAPI](): ChanSelectAPI<T> {
        return {
            readyRecv: this.#readyRecv.bind(this),
            recvSync: this.#recvSync.bind(this),
            readySend: this._readySend.bind(this),
            sendSync: this._sendSync.bind(this),
        };
    }

    async #next(): Promise<IteratorResult<T, any>> {
        if (this.#queue.length > 0) {
            const value = this.#queue.shift() as T;
            if (this.#qWriters.length > 0) {
                this.#qWriters.continue();
            }
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
