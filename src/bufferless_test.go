package main_test

import "testing"

// describe('bufferless channels', () => {
// 	it('works with bufferless channels', async () => {
// 		const ch = new Chan<number>(0);

// 		async function reader() {
// 			for (let i = 0; i < 5; i++) {
// 				const result = await ch.recv();
// 				expect(result).toEqual([i, true]);
// 			}
// 		}

// 		reader();

// 		for (let i = 0; i < 5; i++) {
// 			await ch.send(i);
// 		}
// 	});
// });

// Go equivalent below:

func TestBufferless(t *testing.T) {
	ch := make(chan int)

	go func() {
		for i := 0; i < 5; i++ {
			result := <-ch
			if result != i {
				t.Errorf("expected %d, got %d", i, result)
			}
		}
	}()

	for i := 0; i < 5; i++ {
		ch <- i
	}
}
