import { Chan } from './chan';
import jest from 'jest-mock';
import { select } from './select';

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
});
