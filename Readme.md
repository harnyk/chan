# `@harnyk/chan` - Go channels for TypeScript

This package is my humble attempt to provide a `Chan<T>` class for TypeScript, which would be as much as possible similar to Go's `chan T` type.

## Installation

`npm install @harnyk/chan`

## Usage

See the [tests](./src/chan.test.ts) and [examples](./src/examples) for more information.

## What is supported

-   asynchronous iterating over `Chan<T>` with `for await`
-   asynchronous `send` and `recv`

What is not **yet** supported:

-   `select`-ing on `Chan<T>`, i.e., awaiting the write or read readiness without actually sending or receiving anything

## License

WTFPL

## Contributors

Mark Harnyk (https://github.com/harnyk)
