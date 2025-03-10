export type Callback<T> = (value: T) => void;

export interface QueueStat {
    peakLength: number;
}

export class AbortSignalError extends Error {
    name = 'AbortSignalError';
    constructor() {
        super('Aborted');
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

    block(signal?: AbortSignal) {
        return new Promise<T>((resolve, reject) => {
            if (signal?.aborted) {
                reject(new AbortSignalError());
                return;
            }
            if (signal) {
                signal.addEventListener('abort', () => {
                    // Remove ourrselves from the queue:
                    this.queue.splice(this.queue.indexOf(resolve), 1);
                    reject(new AbortSignalError());
                });
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
