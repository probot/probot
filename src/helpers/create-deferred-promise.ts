export type DeferredPromise<T = void> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

export function createDeferredPromise<T = void>(): DeferredPromise<T> {
  let resolve: ((value: T | PromiseLike<T>) => void) | undefined;
  let reject: ((reason?: unknown) => void) | undefined;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve as (value: T | PromiseLike<T>) => void,
    reject: reject as (reason?: unknown) => void,
  };
}
