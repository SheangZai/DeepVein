import { useSyncExternalStore } from 'react';

import { kv } from './kv';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = kv.get(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    kv.set(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Could not save', key, e);
  }
}

/** A persisted value with change notifications, usable from any component. */
export function createStore<T>(key: string, initial: T) {
  let value = readJSON<T>(key, initial);
  const listeners = new Set<() => void>();

  const store = {
    get: () => value,
    set(next: T | ((prev: T) => T)) {
      value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
      writeJSON(key, value);
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return store;
}

export type Store<T> = ReturnType<typeof createStore<T>>;

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
