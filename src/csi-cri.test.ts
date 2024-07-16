import { Chan } from './chan';

describe('Chan - canSendImmediately and canRecvImmediately', () => {
    it('canSendImmediately should return true when there are waiting receivers', async () => {
        const ch = new Chan<number>(0);

        // Start a receiver that will wait
        const recvPromise = ch.recv();

        // canSendImmediately should return true since there's a waiting receiver
        expect(ch.canSendImmediately()).toBe(true);

        // Clean up
        await ch.send(1);
        await recvPromise;
    });

    it('canSendImmediately should return true when there is space in the buffer', async () => {
        const ch = new Chan<number>(1);

        // canSendImmediately should return true since the buffer is not full
        expect(ch.canSendImmediately()).toBe(true);

        // Fill the buffer
        await ch.send(1);

        // canSendImmediately should return false since the buffer is now full
        expect(ch.canSendImmediately()).toBe(false);

        // Clean up
        await ch.recv();
    });

    it('canRecvImmediately should return true when there are waiting senders', async () => {
        const ch = new Chan<number>(0);

        // Start a sender that will wait
        const sendPromise = ch.send(1);

        // canRecvImmediately should return true since there's a waiting sender
        expect(ch.canRecvImmediately()).toBe(true);

        // Clean up
        await ch.recv();
        await sendPromise;
    });

    it('canRecvImmediately should return true when there is data in the buffer', async () => {
        const ch = new Chan<number>(1);

        // Fill the buffer
        await ch.send(1);

        // canRecvImmediately should return true since there's data in the buffer
        expect(ch.canRecvImmediately()).toBe(true);

        // Clean up
        await ch.recv();
    });

    it('canSendImmediately should return false when the channel is closed', async () => {
        const ch = new Chan<number>(0);
        ch.close();

        // canSendImmediately should return false since the channel is closed
        expect(ch.canSendImmediately()).toBe(false);
    });

    it('canRecvImmediately should return false when the channel is closed', async () => {
        const ch = new Chan<number>(0);
        ch.close();

        expect(ch.canRecvImmediately()).toBe(false);
    });
});
