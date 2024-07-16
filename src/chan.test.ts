import { Chan, ClosedChanError } from './chan';
import { setTimeout } from 'node:timers/promises';

async function toArray<T>(iter: AsyncIterable<T>): Promise<T[]> {
    const result: T[] = [];
    for await (const item of iter) {
        result.push(item);
    }
    return result;
}

describe('Chan', () => {
    it('allows to push, close and read', async () => {
        const ch = new Chan<number>(Number.MAX_SAFE_INTEGER);
        await ch.send(1);
        await ch.send(2);
        await ch.close();
        expect(await toArray(ch)).toEqual([1, 2]);
    });

    it('allows to push slower than read simultaneously', async () => {
        const itemsCount = 100;
        const ch = new Chan<number>(5);
        async function pusher() {
            const result: number[] = [];
            for (let i = 0; i < itemsCount; i++) {
                await setTimeout(10);
                await ch.send(i);
                result.push(i);
            }
            await ch.close();
            return result;
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
        expect(readResult).toEqual(pushResult);
        expect(ch.stat).toEqual({
            // because we have only 1 reader and it is quicker than the writer
            readers: { peakLength: 1 },
            writers: { peakLength: 0 },
            data: { peakLength: 0 },
        });
    });

    it('allows to push quicker than read simultaneously', async () => {
        const itemsCount = 100;
        const ch = new Chan<number>(5);
        async function pusher() {
            const result: number[] = [];
            for (let i = 0; i < itemsCount; i++) {
                await ch.send(i);
                result.push(i);
            }
            await ch.close();
            return result;
        }
        async function reader() {
            const result: number[] = [];
            for await (const item of ch) {
                await setTimeout(10);
                result.push(item);
            }
            return result;
        }
        const [pushResult, readResult] = await Promise.all([
            pusher(),
            reader(),
        ]);
        expect(readResult).toEqual(pushResult);
        expect(ch.stat).toEqual({
            readers: { peakLength: 0 },
            writers: { peakLength: 1 },
            data: { peakLength: 5 },
        });
    });

    it('accumulates up to bufferSize items on late read case', async () => {
        const ch = new Chan<number>(5);
        async function writer() {
            const result: number[] = [];
            for (let i = 0; i < 100; i++) {
                // console.log('sending', i);
                await ch.send(i);
                // console.log('sent', i);

                result.push(i);
            }
            await ch.close();
            return result;
        }
        async function reader() {
            await setTimeout(100);
            const result: number[] = [];
            for await (const item of ch) {
                result.push(item);
            }
            return result;
        }
        const [pushResult, readResult] = await Promise.all([
            writer(),
            reader(),
        ]);
        expect(readResult).toEqual(pushResult);
        expect(ch.stat).toEqual({
            readers: { peakLength: 0 },
            // because we have only 1 writer and it is quicker than the reader
            writers: { peakLength: 1 },
            // because the writer had enough items to fill the buffer
            data: { peakLength: 5 },
        });
    });

    it('supports 1 writer and multiple readers', async () => {
        const ch = new Chan<number>(5);
        const readers: Promise<number[]>[] = [];
        for (let i = 0; i < 10; i++) {
            readers.push(
                (async () => {
                    const result: number[] = [];
                    for await (const item of ch) {
                        result.push(item);
                    }
                    return result;
                })()
            );
        }
        async function writer() {
            const result: number[] = [];
            for (let i = 0; i < 100; i++) {
                await ch.send(i);
                result.push(i);
            }
            ch.close();
            return result;
        }
        const [writerResult, readersResult] = await Promise.all([
            writer(),
            Promise.all(readers),
        ]);
        expect(ch.stat.data.peakLength).toEqual(0);
        expect(ch.stat.writers.peakLength).toEqual(0);
        expect(ch.stat.readers.peakLength).toEqual(10);
        const normalizedReadersResult = readersResult
            .flat()
            .sort((a, b) => a - b);
        expect(normalizedReadersResult).toEqual(writerResult);
    });

    it('supports multiple writers and one reader', async () => {
        const ch = new Chan<number>();
        async function read() {
            const readResult: number[] = [];
            for await (const item of ch) {
                readResult.push(item);
            }
            return readResult;
        }
        const writers: Promise<number[]>[] = [];
        for (let i = 0; i < 10; i++) {
            writers.push(
                (async () => {
                    const results: number[] = [];
                    for (let j = 0; j < 100; j++) {
                        await ch.send(j);
                        results.push(j);
                    }
                    return results;
                })()
            );
        }
        const [readResult, writersResult] = await Promise.all([
            read(),
            Promise.all(writers).then(async (r) => {
                // close the channel after all writers are done
                await ch.close();
                return r;
            }),
        ]);
        expect(readResult.length).toEqual(1000);
        const normalizedWritersResult = writersResult
            .flat()
            .sort((a, b) => a - b);
        expect(normalizedWritersResult).toEqual(readResult);
    });

    it('rejects when closed', async () => {
        const ch = new Chan<number>();
        await ch.close();
        await expect(ch.send(1)).rejects.toThrow(ClosedChanError);
    });

    describe('recv', () => {
        it('receives data', async () => {
            const ch = new Chan<number>();
            // Schedule a send in the future.
            (async () => {
                await setTimeout(0);
                ch.send(1);
            })();
            // Wait for the send to complete.
            const result = await ch.recv();
            expect(result).toEqual([1, true]);
            await ch.close();
            // Attempt to receive from a closed channel.
            const result2 = await ch.recv();
            expect(result2).toEqual([undefined, false]);
        });
    });
});
