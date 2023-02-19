type Json =
  | string
  | number
  | boolean
  | null
  | undefined
  | Json[]
  | { [key: string]: Json };

interface SafeStoreOptionsJson<T> {
  json?: true;
  parse: (rawValue: Json) => T;
  prepare: (rawValue: T) => Json;
}
interface SafeStoreOptionsRaw<T> {
  json: false;
  parse: (rawValue: string) => T;
  prepare: (rawValue: T) => string;
}
export type SafeStoreOptions<T> = {
  storage: Pick<Storage, "getItem" | "setItem">;
  defaultValue: () => T;
} & (SafeStoreOptionsJson<T> | SafeStoreOptionsRaw<T>);

export interface SafeStore<T> {
  getItem: (key: string) => T;
  hasItem: (key: string) => boolean;
  setItem: (key: string, value: T) => void;
}

export function safeStore<T>(options: SafeStoreOptions<T>): SafeStore<T> {
  const parse =
    options.json === false
      ? options.parse
      : (raw: string) => options.parse(JSON.parse(raw));
  const prepare =
    options.json === false
      ? options.prepare
      : (value: T) => JSON.stringify(options.prepare(value));
  function getItemUnsafe(key: string) {
    const raw = options.storage.getItem(key);
    if (raw == null) {
      throw safeStoreError("Missing value");
    }
    return parse(raw);
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
        options.storage.setItem(key, prepare(value));
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
