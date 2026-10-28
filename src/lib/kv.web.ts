/** Browsers already have synchronous storage; skip SQLite's WebAssembly build. */
export const kv = {
  get: (key: string) => globalThis.localStorage?.getItem(key) ?? null,
  set: (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
};
