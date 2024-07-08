/*
// https://go.dev/tour/concurrency/4
package main

import (
	"fmt"
)

func fibonacci(n int, c chan int) {
	x, y := 0, 1
	for i := 0; i < n; i++ {
		c <- x
		x, y = y, x+y
	}
	close(c)
}

func main() {
	c := make(chan int, 10)
	go fibonacci(cap(c), c)
	for i := range c {
		fmt.Println(i)
	}
}
*/

import { Chan } from '../chan.js';

async function fibonacci(n: number, c: Chan<number>) {
    let x = 0,
        y = 1;
    for (let i = 0; i < n; i++) {
        await c.send(x);
        [x, y] = [y, x + y];
    }

    await c.close();
}

async function main() {
    const c = new Chan<number>(10);
    fibonacci(10, c);
    for await (const i of c) {
        console.log(i);
    }
}

main().catch(console.error);
