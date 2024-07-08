import { Chan } from './chan';

/**
 * Compatibility wrapper for Chan, where send operation is available as
 * a combination of the asynchronous `readySend` and synchronous `sendImmediately`
 *
 * Used entirely as a replacement for the Fifo
 * in @sweepbright/iter-helpers
 */
export class CompatChan<T> extends Chan<T> {
    public readySend(): Promise<void> {
        return this._readySend();
    }

    public sendSync(value: T): boolean {
        return this._sendSync(value);
    }
}
