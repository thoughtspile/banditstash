export function safeStore<T, Meta extends SafeStoreMeta = never>(
  { storage, parse, prepare, fallback }: SafeStoreOptions<T, string>
): SafeStore<T, GetKeys<Meta>> {
  function getItemUnsafe(key: string) {
    const raw = storage.getItem(key);
    return raw == null ? safeStore.fail() : parse(raw);
  }
  return {
    getItem: (key) => {
      try {
        return getItemUnsafe(key);
      } catch (err) {
        if (fallback) return fallback();
        throw err;
      }
    },
    setItem: (key, value) => {
      try {
        storage.setItem(key, prepare(value));
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

safeStore.json = function jsonStore<T, Meta extends SafeStoreMeta = never>(
  options: SafeStoreOptions<T, Json>
) {
  return safeStore<T, Meta>({
    ...options,
    parse: data => options.parse(JSON.parse(data)),
    prepare: data => JSON.stringify(options.prepare(data)),
  });
};

safeStore.fail = function fail(message?: string): never {
  throw new TypeError(message || "BanditStore parse failed");
};

/** types */
type Primitive = string | number | boolean | null | undefined;
export type Json = Primitive | Json[] | { [key: string]: Json };

type SafeStoreMeta<Keys extends string = string> = { keys: Keys };
type GetKeys<Meta> = [Meta] extends [SafeStoreMeta<infer Keys>] ? Keys : string;

export interface SafeStoreOptions<T, StorageType> {
  storage: Pick<Storage, "getItem" | "setItem">;
  fallback: false | (() => T);
  parse: (rawValue: StorageType) => T;
  prepare: (rawValue: T) => StorageType;
}

export interface SafeStore<T, Keys extends string> {
  getItem: (key: Keys) => T;
  hasItem: (key: Keys) => boolean;
  setItem: (key: Keys, value: T) => void;
}
