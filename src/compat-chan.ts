import { Chan, ClosedChanError } from './chan';

export class CompatChan<T> extends Chan<T> {
    private readyToSend: boolean = false;

    constructor(capacity: number = 0) {
        super(capacity);
    }

    async readySend(): Promise<void> {
        if (this.capacity > 0 && this.buffer.length < this.capacity) {
            // If there's space in the buffer, no need to block
            this.readyToSend = true;
        } else {
            await this.sendQueue.block();
            this.readyToSend = true;
        }
    }

    sendSync(value: T): boolean {
        if (!this.readyToSend) {
            return false;
        }

        this.readyToSend = false;
        this.send(value).catch((error) => {
            if (error instanceof ClosedChanError) {
                console.error('Channel is closed');
            } else {
                throw error;
            }
        });

        return true;
    }
}
