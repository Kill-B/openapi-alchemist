declare module 'deep-sort-object' {
  function sortObject(obj: any, compareFn?: (a: string, b: string) => number): any;
  export = sortObject;
}

declare module 'traverse' {
  interface Traverse {
    forEach(callback: (this: { remove(): void }, value: any) => void): void;
  }
  function traverse(obj: any): Traverse;
  export = traverse;
  export as namespace traverse;
}

declare module 'bluebird' {
  interface BluebirdStatic {
    method<T>(fn: (...args: any[]) => T): (...args: any[]) => Bluebird<T>;
    fromCallback<T>(fn: (callback: (err: any, result: T) => void) => void): Bluebird<T>;
    resolve<T>(value?: T): Bluebird<T>;
    map<T, U>(values: T[], mapper: (value: T) => U, options?: any): Bluebird<U[]>;
    any<T>(values: Bluebird<T>[]): Bluebird<T>;
    try<T>(fn: () => T | Bluebird<T>): Bluebird<T>;
    AggregateError: any;
  }
  
  interface Bluebird<T> {
    asCallback(callback?: (err: any, result: T) => void): Bluebird<T>;
    spread<U>(fn: (...args: any[]) => U): Bluebird<U>;
    return<U>(value: U): Bluebird<U>;
  }
}
