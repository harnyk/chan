# `@harnyk/chan` - Go channels for TypeScript

This package is my humble attempt to provide a `Chan<T>` class for TypeScript, which would be as much as possible similar to Go's `chan T` type.

## Installation

`npm install @harnyk/chan`

## Usage

See the [tests](./src/chan.test.ts) and [examples](./src/examples) for more information.

Brief reference:

<table>
<tr><th></th><th>Go equivalent</th><th>TypeScript</th></tr>

<tr>
<td>
Create a channel of `number` with no buffer:
</td>
<td>

```go
ch := make(chan int)
```

</td>
<td>

```ts
const ch = new Chan<number>();
```

</td>
</tr>

<!--  -->

<tr>
<td>
Create a channel of `number` with fixed-size buffer:
</td>
<td>

```go
ch := make(chan int, 5)
```

</td>
<td>

```ts
const ch = new Chan<number>(5);
```

</td>
</tr>

<!--  -->

<tr>
<td>
Iterate over `Chan<T>` with `for await`
</td>
<td>

```go
for v := range ch {
    fmt.Println(v)
}
```

</td>
<td>

```ts
for await (const v of ch) {
    console.log(v);
}
```

</td>
</tr>
<!--  -->

<tr>
<td>
Send a value to `Chan<T>` with `send`
</td>
<td>

```go
ch <- 42
```

</td>
<td>

```ts
await ch.send(42);
```

</td>
</tr>
<!--  -->

<tr>
<td>
Receive a value from `Chan<T>` with `recv`
</td>
<td>

```go
v, ok := <-ch
```

</td>
<td>

```ts
const [v, ok] = await ch.recv();
```

</td>
</tr>
<!--  -->

<tr>
<td>
Close `Chan<T>`
</td>
<td>

```go
close(ch)
```

</td>
<td>

```ts
ch.close();
```

</td>
</tr>
<!--  -->

<tr>
<td>
Select over multiple channels
</td>
<td>

```go
select {
    case ch <- 42:
        fmt.Println("sent")
    case v := <-ch1:
        fmt.Printf("Received %d\n", v)
    default:
        fmt.Println("default")
}
```

</td>
<td>

```ts
await select()
    .send(ch, 42, () => console.log('sent'))
    .recv(ch1, (v) => console.log(`Received ${v}`))
    .default(() => console.log('default'));
```

</td>
</tr>
<!--  -->

</table>

## What is supported

-   asynchronous iterating over `Chan<T>` with `for await`
-   asynchronous `send` and `recv`
-   `select`-ing over multiple channels

## License

WTFPL

## Contributors

Mark Harnyk (https://github.com/harnyk)
