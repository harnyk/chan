import jest from 'jest-mock';
import { setTimeout } from 'node:timers/promises';
import { Chan } from './chan.js';
import { select } from './select.js';

describe('select', () => {
    describe('minimal example', () => {
        it('uses Promise.race to illustrate how to select manually', async () => {
            /*
            // Equivalent Go code:
            package main
    
            import "fmt"
    
            func evaluate() int {
                fmt.Println("evaluating")
                return 42
            }
    
            func main() {
                chToWrite := make(chan int)
                chToRead := make(chan int, 100)
    
                chToRead <- 1
                chToRead <- 2
                chToRead <- 3
    
                for i := 0; i < 3; i++ {
                    select {
                    case chToWrite <- evaluate():
                        fmt.Println("wrote to chToWrite")
                    case v := <-chToRead:
                        fmt.Println("read from chToRead", v)
                    }
                }
            }
            */

            const log = jest.spyOn(console, 'log');

            function evaluate() {
                console.log('evaluating');
                return 42;
            }

            const chToWrite = new Chan<number>();
            const chToRead = new Chan<number>(89);

            chToRead.send(1);
            chToRead.send(2);
            chToRead.send(3);

            for (let i = 0; i < 3; i++) {
                // Let's create a signal that will be used to abort all the blocked
                // operations in the select once one of them is done
                const ac = new AbortController();

                await Promise.race([
                    chToWrite.send(evaluate(), ac.signal).then(() => {
                        ac.abort();
                        console.log('wrote to chToWrite');
                    }),
                    chToRead.recv(ac.signal).then((v) => {
                        ac.abort();
                        console.log('read from chToRead', v);
                    }),
                ]);
            }

            expect(log.mock.calls).toEqual([
                ['evaluating'],
                ['read from chToRead', [1, true]],
                ['evaluating'],
                ['read from chToRead', [2, true]],
                ['evaluating'],
                ['read from chToRead', [3, true]],
            ]);

            log.mockClear();
        });

        it('is how the same is achived using select', async () => {
            const log = jest.spyOn(console, 'log');

            function evaluate() {
                console.log('evaluating');
                return 42;
            }

            const chToWrite = new Chan<number>();
            const chToRead = new Chan<number>(89);

            chToRead.send(1);
            chToRead.send(2);
            chToRead.send(3);

            for (let i = 0; i < 3; i++) {
                await select()
                    .send(chToWrite, evaluate(), () => {
                        console.log('wrote to chToWrite');
                    })
                    .recv(chToRead, (v) => {
                        console.log('read from chToRead', v);
                    });
            }

            expect(log.mock.calls).toEqual([
                ['evaluating'],
                ['read from chToRead', [1, true]],
                ['evaluating'],
                ['read from chToRead', [2, true]],
                ['evaluating'],
                ['read from chToRead', [3, true]],
            ]);

            log.mockClear();
        });
    });

    it('should execute immediate send operation', async () => {
        const log = jest.spyOn(console, 'log');
        const ch = new Chan<number>(1);

        await select().send(ch, 42, () => {
            console.log('sent 42');
        });

        expect(log.mock.calls).toEqual([['sent 42']]);
        expect(await ch.recv()).toEqual([42, true]);
        log.mockClear();
    });

    it('should execute immediate recv operation', async () => {
        const log = jest.spyOn(console, 'log');
        const ch = new Chan<number>(1);
        await ch.send(42);

        await select().recv(ch, (value) => {
            console.log('received', value);
        });

        expect(log.mock.calls).toEqual([['received', [42, true]]]);
        log.mockClear();
    });

    it('should execute default operation when no immediate operation is available', async () => {
        const log = jest.spyOn(console, 'log');
        const ch = new Chan<number>(0);

        await select()
            .recv(ch, () => {
                console.log('should not happen');
            })
            .send(ch, 42, () => {
                console.log('should not happen');
            })
            .default(() => {
                console.log('default executed');
            });

        expect(log.mock.calls).toEqual([['default executed']]);
        log.mockClear();
    });

    it('should execute send operation when it becomes available', async () => {
        const log = jest.spyOn(console, 'log');
        const ch = new Chan<number>(0);
        let received: number | undefined;

        setTimeout(100).then(async () => {
            [received] = await ch.recv();
        }); // This will make send available after 100ms

        await select().send(ch, 42, () => {
            console.log('sent 42');
        });

        expect(log.mock.calls).toEqual([['sent 42']]);
        expect(received).toEqual(42);
        log.mockClear();
    });

    it('should execute recv operation when it becomes available', async () => {
        const log = jest.spyOn(console, 'log');
        const ch = new Chan<number>(0);

        setTimeout(100).then(() => ch.send(42)); // This will make recv available after 100ms

        await select().recv(ch, (value) => {
            console.log('received', value);
        });

        expect(log.mock.calls).toEqual([['received', [42, true]]]);
        log.mockClear();
    });

    it('should handle multiple operations and execute the first available', async () => {
        const log = jest.spyOn(console, 'log');
        const chSend = new Chan<number>(0);
        const chRecv = new Chan<number>(0);

        let received: number | undefined;

        setTimeout(100).then(async () => {
            [received] = await chSend.recv();
        }); // Make send available after 100ms
        setTimeout(200).then(() => chRecv.send(42)); // Make recv available after 200ms

        await select()
            .send(chSend, 84, () => {
                console.log('sent 84 to chSend');
            })
            .recv(chRecv, (value) => {
                console.log('received from chRecv', value);
            });

        expect(log.mock.calls).toEqual([['sent 84 to chSend']]);
        expect(received).toEqual(84);

        await select()
            .send(chSend, 84, () => {
                console.log('sent 84 to chSend');
            })
            .recv(chRecv, (value) => {
                console.log('received from chRecv', value);
            });

        expect(log.mock.calls).toEqual([
            ['sent 84 to chSend'],
            ['received from chRecv', [42, true]],
        ]);
        log.mockClear();
    });

    it('should resolve immediately when no operations are available', async () => {
        const log = jest.spyOn(console, 'log');
        await select();
        log.mockClear();
    });
});
