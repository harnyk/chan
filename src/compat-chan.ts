import { Chan, ClosedChanError } from './chan.js';
import { just } from './maybe.js';

export class CompatChan<T> extends Chan<T> {
    constructor(capacity: number = 0) {
        super(capacity);
    }

    /**
     * Waits until the channel is ready to send data without blocking.
     * @returns {Promise<void>}
     */
    async readySend(signal?: AbortSignal): Promise<void> {
        if (this.closed) {
            throw new ClosedChanError();
        }

        if (this.canSendImmediately()) {
            return;
        }
        await this.sendQueue.block(signal);
    }

    /**
     * Attempts to send a value synchronously. Returns true if successful, false otherwise.
     * @param {T} value - The value to send.
     * @returns {boolean}
     */
    sendSync(value: T): boolean {
        if (this.closed) {
            throw new ClosedChanError();
        }

        if (this.recvQueue.length > 0) {
            this.recvQueue.continue(just(value));
            return true;
        } else if (this.capacity > 0 && this.buffer.length < this.capacity) {
            this.buffer.push(value);
            this.countStat();
            return true;
        } else {
            return false;
        }
    }
}
