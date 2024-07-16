import { Chan, ChanSelectAPI, Maybe } from './chan';
import {
    RecvChannelClosed,
    RecvResultInQueue,
    SelectAPI,
} from './private-symbols';

enum SelectOpType {
    Recv = 1,
    Send = 2,
}

interface SelectOpRecv<T> {
    type: SelectOpType.Recv;
    api: ChanSelectAPI<T>;
    cb: (value: T) => void;
}

interface SelectOpSend<T> {
    type: SelectOpType.Send;
    api: ChanSelectAPI<T>;
    value: () => T;
}

type SelectOp<T> = SelectOpRecv<T> | SelectOpSend<T>;

class SelectStatement {
    #ops: SelectOp<any>[] = [];
    recv<T>(chan: Chan<T>, cb: (value: T) => void) {
        this.#ops.push({
            type: SelectOpType.Recv,
            api: chan[SelectAPI](),
            cb,
        });
        return this;
    }

    send<T>(chan: Chan<T>, value: () => T) {
        this.#ops.push({
            type: SelectOpType.Send,
            api: chan[SelectAPI](),
            value,
        });
        return this;
    }

    async promise() {
        const abortController = new AbortController();
        const signal = abortController.signal;

        const readyPromisesForRace: Promise<
            | (SelectOpRecv<any> & {
                  readonly result:
                      | typeof RecvChannelClosed
                      | typeof RecvResultInQueue
                      | Maybe<any>;
              })
            | SelectOpSend<any>
        >[] = [];

        for (const op of this.#ops) {
            switch (op.type) {
                case SelectOpType.Recv: {
                    const promise = op.api
                        .readyRecv({ signal })
                        .then((result) => {
                            // Aborting all pending promises ASAP
                            abortController.abort();
                            return { ...op, result } as const;
                        });

                    readyPromisesForRace.push(promise);
                    break;
                }
                case SelectOpType.Send: {
                    const promise = op.api.readySend({ signal }).then(() => {
                        // Aborting all pending promises ASAP
                        abortController.abort();
                        return op;
                    });
                    readyPromisesForRace.push(promise);
                    break;
                }
            }
        }

        const r = await Promise.race(readyPromisesForRace);

        switch (r.type) {
            case SelectOpType.Recv: {
                switch (r.result) {
                    case RecvChannelClosed: {
                        return;
                    }
                    case RecvResultInQueue: {
                        const [value, ok] = r.api.recvSync();
                        if (ok) {
                            r.cb(value);
                        }
                        return;
                    }
                    default: {
                        const [value, ok] = r.result;
                        if (ok) {
                            r.cb(value);
                        }
                    }
                }
                break;
            }
            case SelectOpType.Send: {
                r.api.sendSync(r.value());
                break;
            }
        }
    }
}

export function select() {
    return new SelectStatement();
}
