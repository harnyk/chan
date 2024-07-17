import { CompatChan } from './compat-chan';
import { just } from './maybe';

describe('CompatChan', () => {
    it('allows to send', async () => {
        const ch = new CompatChan<number>();
        const pusher = async () => {
            await ch.readySend();
            ch.sendSync(1);
        };
        const reader = async () => {
            const result = await ch.recv();
            expect(result).toEqual(just(1));
        };
        await Promise.all([pusher(), reader()]);
    });

    it('allows to send and iterate', async () => {
        const ch = new CompatChan<number>();
        const pusher = async () => {
            const result: number[] = [];
            for (let i = 0; i < 100; i++) {
                await ch.readySend();
                ch.sendSync(i);
                result.push(i);
            }
            ch.close();
            return result;
        };
        const reader = async () => {
            const result: number[] = [];
            for await (const item of ch) {
                result.push(item);
            }
            return result;
        };
        const [pushResult, readResult] = await Promise.all([
            pusher(),
            reader(),
        ]);

        expect(readResult.length).toEqual(100);

        expect(readResult).toEqual(pushResult);
    });

    it('allows to bufferize', async () => {
        const ch = new CompatChan<number>(2);

        await ch.readySend();
        expect(ch.sendSync(1)).toEqual(true);

        await ch.readySend();
        expect(ch.sendSync(2)).toEqual(true);

        expect(await ch.recv()).toEqual(just(1));
        expect(await ch.recv()).toEqual(just(2));
    });

    it('does not allow to send more than the capacity', async () => {
        const ch = new CompatChan<number>(2);

        expect(ch.sendSync(1)).toEqual(true);
        expect(ch.sendSync(2)).toEqual(true);
        expect(ch.sendSync(3)).toEqual(false);

        expect(await ch.recv()).toEqual(just(1));
        expect(await ch.recv()).toEqual(just(2));
    });

    it('does not allow to send after close', async () => {
        const ch = new CompatChan<number>();
        ch.close();
        expect(() => ch.sendSync(1)).toThrow();
    });

    it('does not allow to send after close (readySend)', async () => {
        const ch = new CompatChan<number>();
        ch.close();
        expect(ch.readySend()).rejects.toThrow();
    });
});
