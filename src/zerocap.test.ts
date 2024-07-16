import { Chan, ClosedChanError } from './chan.js';

describe('Zero Capacity Chan', () => {
    it('allows concurrent push and pop without deadlock', async () => {
        const ch = new Chan<number>(0);
        const itemsCount = 100;

        async function pusher() {
            for (let i = 0; i < itemsCount; i++) {
                await ch.send(i);
            }
            ch.close();
        }

        async function reader() {
            const result: number[] = [];
            for await (const item of ch) {
                result.push(item);
            }
            return result;
        }

        const [pushResult, readResult] = await Promise.all([
            pusher(),
            reader(),
        ]);
        expect(readResult).toEqual(
            Array.from({ length: itemsCount }, (_, i) => i)
        );
    });

    it('handles multiple concurrent readers and writers without deadlock', async () => {
        const ch = new Chan<number>(0);
        const itemsCount = 100;

        async function writer(id: number) {
            for (let i = 0; i < itemsCount; i++) {
                await ch.send(id * itemsCount + i);
            }
        }

        async function reader() {
            const result: number[] = [];
            for await (const item of ch) {
                result.push(item);
            }
            return result;
        }

        const writers = Array.from({ length: 5 }, (_, i) => writer(i));
        const readers = Array.from({ length: 5 }, () => reader());

        const [readerResults] = await Promise.all([
            Promise.all(readers),
            Promise.all(writers).then(async () => {
                ch.close();
            }),
        ]);

        const allReadItems = readerResults.flat().sort((a, b) => a - b);
        const expectedItems = Array.from(
            { length: itemsCount * 5 },
            (_, i) => i
        );

        expect(allReadItems).toEqual(expectedItems);
    });

    it('closes without deadlock when empty', async () => {
        const ch = new Chan<number>(0);

        ch.close();

        const result = await ch.recv();
        expect(result).toEqual([undefined, false]);
    });

    it('throws ClosedChanError when sending to a closed channel', async () => {
        const ch = new Chan<number>(0);
        ch.close();
        await expect(ch.send(1)).rejects.toThrow(ClosedChanError);
    });

    it('supports immediate send and receive without deadlock', async () => {
        const ch = new Chan<number>(0);

        async function pusher() {
            for (let i = 0; i < 10; i++) {
                await ch.send(i);
            }
            ch.close();
        }

        async function reader() {
            const result: number[] = [];
            for await (const item of ch) {
                result.push(item);
            }
            return result;
        }

        const [pushResult, readResult] = await Promise.all([
            pusher(),
            reader(),
        ]);
        expect(readResult).toEqual(Array.from({ length: 10 }, (_, i) => i));
    });
});
