import { Chan, ClosedChanError } from './chan';
import { Maybe } from './maybe';
type OpSend<T> = {
    type: 'send';
    channel: Chan<T>;
    value: T;
    callback: () => void;
};
type OpRecv<T> = {
    type: 'recv';
    channel: Chan<T>;
    callback: (value: Maybe<T>) => void;
};
type Op<T> = OpSend<T> | OpRecv<T>;

class Select {
    private operations: Array<Op<any>> = [];

    send<T>(channel: Chan<T>, value: T, callback: () => void): this {
        this.operations.push({ type: 'send', channel, value, callback });

        return this;
    }

    recv<T>(channel: Chan<T>, callback: (value: Maybe<T>) => void): this {
        this.operations.push({ type: 'recv', channel, callback });
        return this;
    }

    promise(): Promise<void> {
        const ac = new AbortController();
        const signal = ac.signal;

        const wrappedOperations = this.operations.map((operation) => {
            if (operation.type === 'send') {
                return operation.channel
                    .send(operation.value, signal)
                    .then(() => {
                        ac.abort();
                        operation.callback();
                    });
            } else if (operation.type === 'recv') {
                return operation.channel.recv(signal).then((value) => {
                    ac.abort();
                    operation.callback(value);
                });
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

export { select, Select };
