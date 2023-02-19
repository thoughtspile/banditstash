type Json =
  | string
  | number
  | boolean
  | null
  | undefined
  | Json[]
  | { [key: string]: Json };

export interface SafeStoreOptions<T> {
  storage: Pick<Storage, "getItem" | "setItem">;
  defaultValue: () => T;
  parse: (rawValue: Json) => T;
  prepare: (rawValue: T) => Json;
}

export interface SafeStore<T> {
  getItem: (key: string) => T;
  hasItem: (key: string) => boolean;
  setItem: (key: string, value: T) => void;
}

export function safeStore<T>(options: SafeStoreOptions<T>): SafeStore<T> {
  function getItemUnsafe(key: string) {
    const raw = options.storage.getItem(key);
    if (raw == null) {
      throw safeStoreError("Missing value");
    }
    return options.parse(JSON.parse(raw));
  }
  return {
    getItem: (key) => {
      try {
        return getItemUnsafe(key);
      } catch (err) {
        return options.defaultValue();
      }
    },
    setItem: (key, value) => {
      try {
        options.storage.setItem(key, JSON.stringify(options.prepare(value)));
      } catch (err) {}
    },
    hasItem: (key) => {
      try {
        getItemUnsafe(key);
        return true;
      } catch (err) {
        return false;
      }
    },
  };
}

export function safeStoreError(message = "SafeStore failed") {
  return new TypeError(message);
}
