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

import { Chan } from '../chan';
import { select } from '../select';

async function fibonacci(c: Chan<number>, quit: Chan<number>) {
    let x = 0,
        y = 1;
    for (;;) {
        let shouldReturn = false;
        await select()
            .send(c, x, () => {
                [x, y] = [y, x + y];
            })
            .recv(quit, () => {
                console.log('quit');
                shouldReturn = true;
            });

        if (shouldReturn) {
            return;
        }
    }
}

function main() {
    const c = new Chan<number>();
    const quit = new Chan<number>();
    setImmediate(async () => {
        for (let i = 0; i < 10; i++) {
            console.log(await c.recv());
        }
        await quit.send(0);
    });
    fibonacci(c, quit);
}

main();
