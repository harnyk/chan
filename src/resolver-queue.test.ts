import { AbortSignalError, ResolverQueue } from './resolver-queue';
import { setImmediate } from 'node:timers/promises';

describe('ResolverQueue', () => {
    it('blocks and continues', async () => {
        const queue = new ResolverQueue<number>();

        setImmediate().then(() => {
            queue.continue(1);
            queue.continue(2);
        });

        const value = await Promise.all([queue.block(), queue.block()]);
        expect(value).toEqual([1, 2]);
    });

    it('blocks, but allows to cancel the block using signal', async () => {
        const queue = new ResolverQueue<number>();
        const abortController = new AbortController();

        setImmediate().then(() => {
            abortController.abort();
        });

        setImmediate().then(() => {
            if (queue.length > 0) {
                queue.continue(1);
            }

            if (queue.length > 0) {
                queue.continue(2);
            }
        });

        const values = await Promise.allSettled([
            queue.block({ signal: abortController.signal }),
            queue.block({ signal: abortController.signal }),
        ]);

        expect(values).toEqual([
            {
                status: 'rejected',
                reason: new AbortSignalError(),
            },
            {
                status: 'rejected',
                reason: new AbortSignalError(),
            },
        ]);
    });
});
