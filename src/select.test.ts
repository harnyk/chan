import { Chan } from './chan';
import { select } from './select';

describe('select', () => {
    it('works', async () => {
        const chanA = new Chan<number>();
        const chanB = new Chan<number>();

        (async () => {
            await chanA.send(1);
        })();
        (async () => {
            await chanB.send(100);
        })();

        let leftoverChan: Chan<number> | undefined;

        await select()
            .recv(chanA, (value) => {
                console.log('chanA', value);
            })
            .recv(chanB, (value) => {
                console.log('chanB', value);
            })
            .promise();

        const leftoverValue = await leftoverChan?.recv();
        console.log('leftoverValue', leftoverValue);
    });
});
