/*
// https://go.dev/tour/concurrency/5

package main

import "fmt"

func fibonacci(c, quit chan int) {
	x, y := 0, 1
	for {
		select {
		case c <- x:
			x, y = y, x+y
		case <-quit:
			fmt.Println("quit")
			return
		}
	}
}

func main() {
	c := make(chan int)
	quit := make(chan int)
	go func() {
		for i := 0; i < 10; i++ {
			fmt.Println(<-c)
		}
		quit <- 0
	}()
	fibonacci(c, quit)
}


*/

import { Chan } from '../chan.js';
import { select } from '../select.js';

async function fibonacci(c: Chan<number>, quit: Chan<number>) {
    let x = 0,
        y = 1;
    while (true) {
        let shouldQuit = false;
        await select()
            .send(c, () => {
                const send = x;
                [x, y] = [y, x + y];
                console.log('sending:', send);
                return send;
            })
            .recv(quit, () => {
                console.log('quit');
                shouldQuit = true;
            })
            .promise();

        if (shouldQuit) {
            break;
        }
    }
}

async function main() {
    const c = new Chan<number>(0);
    const quit = new Chan<number>(0);

    setTimeout(async () => {
        for (let i = 0; i < 10; i++) {
            console.log('receiving...');
            const val = await c.recv();
            console.log('received:', val);
        }

        console.log('sending quit...');
        await quit.send(0);
        console.log('sent quit');
    }, 0);

    setTimeout(() => fibonacci(c, quit), 0);
}

main().catch((error) => {
    debugger;
    console.error(error);
});
