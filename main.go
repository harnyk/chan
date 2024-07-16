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
