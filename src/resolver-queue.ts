import { Callback } from './chan';

export interface QueueStat {
    peakLength: number;
}

export interface BlockOptions {
    signal?: AbortSignal;
}

export class AbortSignalError extends Error {
    name = 'AbortSignalError';
    constructor() {
        super('Aborted');
    }
}

export class EmptyResolverQueueError extends Error {
    constructor() {
        super('ResolverQueue is empty');
    }
}

export class ResolverQueue<T> {
    private queue: Callback<T>[] = [];

    private _stat: QueueStat = {
        peakLength: 0,
    };

    private countStats() {
        if (this.queue.length > this._stat.peakLength) {
            this._stat.peakLength = this.queue.length;
        }
    }

    get stat(): Readonly<QueueStat> {
        return this._stat;
    }

    block({ signal }: BlockOptions = {}): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            if (signal) {
                signal.addEventListener(
                    'abort',
                    () => {
                        const index = this.queue.indexOf(resolve);
                        if (index !== -1) {
                            this.queue.splice(index, 1);
                        }
                        reject(new AbortSignalError());
                    },
                    { once: true }
                );
            }

            this.queue.push(resolve);
            this.countStats();
        });
    }

    continue(value: T) {
        if (this.queue.length > 0) {
            const resolver = this.queue.shift();
            if (resolver) {
                resolver(value);
            }
        } else {
            throw new EmptyResolverQueueError();
        }
    }

    continueAll(value: T) {
        while (this.queue.length > 0) {
            this.continue(value);
        }
    }

    get length() {
        return this.queue.length;
    }
}
