/**
 * Utility type that acts as an alternate for `type[key]`. This type provides better support for aliasing
 * types when parsing them using the abstract syntax tree, used when generating documentation.
 */
export type KeyOf<T, K extends keyof T> = Omit<T[K], "">;

/**
 * Defines a type that implements a constructor that accepts an array of `any` parameters; utilized for mixins.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = object> = new (...args: any[]) => T;
