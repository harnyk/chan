/*
// https://go.dev/tour/concurrency/2

package main

import "fmt"

func sum(s []int, c chan int) {
	sum := 0
	for _, v := range s {
		sum += v
	}
	c <- sum // send sum to c
}

func main() {
	s := []int{7, 2, 8, -9, 4, 0}

	c := make(chan int)
	go sum(s[:len(s)/2], c)
	go sum(s[len(s)/2:], c)
	x, y := <-c, <-c // receive from c

	fmt.Println(x, y, x+y)
}
*/

import { ok } from 'assert';
import { Chan } from '../chan.js';

async function sum(s: number[], c: Chan<number>) {
    let sum = 0;
    for (let i = 0; i < s.length; i++) {
        sum += s[i];
    }
    await c.send(sum);
}

async function main() {
    const s = [7, 2, 8, -9, 4, 0];
    const c = new Chan<number>();

    sum(s.slice(0, s.length / 2), c);
    sum(s.slice(s.length / 2), c);

    const [x] = await c.recv();
    const [y] = await c.recv();
    ok(x);
    ok(y);
    console.log(x, y, x + y);
}

await main();
