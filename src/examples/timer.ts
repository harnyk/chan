/*
package main

import "time"

func main() {
	ch := make(chan struct{})

	go func() {
		for i := 0; i < 10; i++ {
			ch <- struct{}{}
			time.Sleep(100 * time.Millisecond)
		}
		close(ch)
	}()

	t := time.NewTimer(300 * time.Millisecond)

	for {
		select {
		case <-ch:
			println("tick")
		case <-t.C:
			println("timeout")
			return
		}
	}
}

*/

import { Chan } from '../chan';
import { select } from '../select';
import { setTimeout as sleep } from 'node:timers/promises';

// Very limited equivalent of time.Timer
// just for testing
// https://github.com/golang/go/blob/master/src/time/sleep.go
class Timer {
    public readonly C = new Chan<void>();
    constructor(private timeout: number) {
        setTimeout(() => this.C.send(), timeout);
    }
}

async function main() {
    const ch = new Chan<void>();
    const t = new Timer(300);

    (async () => {
        for (let i = 0; i < 10; i++) {
            await ch.send();
            await sleep(100);
        }
        ch.close();
    })();

    for (;;) {
        let shouldReturn = false;
        await select()
            .recv(ch, () => {
                console.log('tick');
            })
            .recv(t.C, () => {
                console.log('timeout');
                shouldReturn = true;
            });

        if (shouldReturn) {
            return;
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
