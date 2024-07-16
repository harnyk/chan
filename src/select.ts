import { Chan } from './chan';
import { Maybe } from './maybe';
const enum OpType {
    Send = 1,
    Recv,
    Default,
}

type OpSend<T> = {
    type: OpType.Send;
    channel: Chan<T>;
    value: T;
    callback: () => void;
};
type OpRecv<T> = {
    type: OpType.Recv;
    channel: Chan<T>;
    callback: (value: Maybe<T>) => void;
};
type OpDefault = {
    type: OpType.Default;
    callback: () => void;
};
type Op<T> = OpSend<T> | OpRecv<T> | OpDefault;

class Select {
    private operations: Array<Op<any>> = [];

    send<T>(channel: Chan<T>, value: T, callback: () => void): this {
        this.operations.push({ type: OpType.Send, channel, value, callback });

        return this;
    }

    recv<T>(channel: Chan<T>, callback: (value: Maybe<T>) => void): this {
        this.operations.push({ type: OpType.Recv, channel, callback });
        return this;
    }

    default(callback: () => void): Omit<this, 'default'> {
        this.operations.push({ type: OpType.Default, callback });
        return this;
    }

    promise(): Promise<void> {
        // Select with no operations is a no-op
        if (this.operations.length === 0) {
            return Promise.resolve();
        }

        // Try to find an immediately available operation
        for (const operation of this.operations) {
            switch (operation.type) {
                case OpType.Send: {
                    if (operation.channel.canSendImmediately()) {
                        operation.channel.send(operation.value).then(() => {
                            operation.callback();
                        });
                        return Promise.resolve();
                    }
                }

                case OpType.Recv: {
                    if (operation.channel.canRecvImmediately()) {
                        operation.channel.recv().then((value) => {
                            operation.callback(value);
                        });
                        return Promise.resolve();
                    }
                }
            }
        }

        // If no immediate operation is available, and there is a default
        // operation, execute it
        const defaultOperation = this.operations.find(
            (operation) => operation.type === OpType.Default
        );
        if (defaultOperation) {
            defaultOperation.callback();
            return Promise.resolve();
        }

        // If no immediate operation is available, and there is no default operation,
        // wait for any operation to become available
        const ac = new AbortController();
        const signal = ac.signal;

        const wrappedOperations = this.operations.map((operation) => {
            switch (operation.type) {
                case OpType.Send: {
                    return operation.channel
                        .send(operation.value, signal)
                        .then(() => {
                            ac.abort();
                            operation.callback();
                        });
                }
                case OpType.Recv: {
                    return operation.channel.recv(signal).then((value) => {
                        ac.abort();
                        operation.callback(value);
                    });
                }
            }
        });

        return Promise.race(wrappedOperations).catch((e) => {
            ac.abort();
            return Promise.reject(e);
        });
    }

    then<TResult1 = void, TResult2 = never>(
        onfulfilled?:
            | ((value: void) => TResult1 | PromiseLike<TResult1>)
            | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return this.promise().then(onfulfilled, onrejected);
    }
}

function select(): Select {
    return new Select();
}

export { select };
