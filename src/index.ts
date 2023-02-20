export function safeStore<T, Meta extends SafeStoreMeta = never>(
  options: SafeStoreOptions<T, string>
): SafeStore<T, GetKeys<Meta>> {
  const { storage, parse, prepare, fallback, safeSet = true } = options;
  return {
    getItem: (key) => {
      try {
        const raw = storage.getItem(key);
        return raw == null ? safeStore.fail() : parse(raw);
      } catch (err) {
        if (fallback) return fallback();
        throw err;
      }
    },
    setItem: (key, value) => {
      try {
        storage.setItem(key, prepare(value));
      } catch (err) {
        if (!safeSet) throw err;
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
  safeSet?: boolean;
}

export interface SafeStore<T, Keys extends string> {
  getItem: (key: Keys) => T;
  setItem: (key: Keys, value: T) => void;
}
