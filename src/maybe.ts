type Just<T> = readonly [T, true];
type Nothing = readonly [undefined, false];
export type Maybe<T> = Just<T> | Nothing;
export function just<T>(value: T): Just<T> {
    return [value, true];
}
export function nothing(): Nothing {
    return [undefined, false];
}
function isJust<T>(value: Maybe<T>): value is Just<T> {
    return value[1];
}
export function isNothing<T>(value: Maybe<T>): value is Nothing {
    return !value[1];
}
export function valueOf<T>(value: Just<T>): T {
    return value[0];
}
