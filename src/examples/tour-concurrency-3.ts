/*
// https://go.dev/tour/concurrency/3
package main

import "fmt"

func main() {
	ch := make(chan int, 2)
	ch <- 1
	ch <- 2
	fmt.Println(<-ch)
	fmt.Println(<-ch)
}

*/

import { Chan } from '../chan.js';

async function main() {
    const ch = new Chan<number>(2);
    await ch.send(1);
    await ch.send(2);
    console.log(await ch.recv());
    console.log(await ch.recv());
}

await main();
