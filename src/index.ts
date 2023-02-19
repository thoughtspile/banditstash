type Json =
  | string
  | number
  | boolean
  | null
  | undefined
  | Json[]
  | { [key: string]: Json };

type SafeStoreKeyOptions<Keys extends string = string> = { keys?: Keys };

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

export interface SafeStore<T, Keys extends string> {
  getItem: (key: Keys) => T;
  hasItem: (key: Keys) => boolean;
  setItem: (key: Keys, value: T) => void;
}

export function safeStore<T, Meta extends SafeStoreKeyOptions = never>(
  options: SafeStoreOptions<T>
): SafeStore<
  T,
  [Meta] extends [SafeStoreKeyOptions<infer Keys>] ? Keys : string
> {
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
    return raw == null ? fail() : parse(raw);
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

export function fail(message?: string): never {
  throw new TypeError(message || "BanditStore parse failed");
}
