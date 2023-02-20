export function safeStore<T>(options: SafeStoreOptions<T, string>) {
  const { storage, parse, prepare, fallback, safeSet = true } = options;
  const store: SafeStore<T> = {
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
    limitKeys: () => store,
  };
  return store;
}

safeStore.json = function jsonStore<T>(options: SafeStoreOptions<T, Json>) {
  return safeStore<T>({
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

export interface SafeStoreOptions<T, StorageType> {
  storage: Pick<Storage, "getItem" | "setItem">;
  fallback: false | (() => T);
  parse: (rawValue: StorageType) => T;
  prepare: (rawValue: T) => StorageType;
  safeSet?: boolean;
}

export interface SafeStore<T, Keys extends string = string> {
  getItem: (key: Keys) => T;
  setItem: (key: Keys, value: T) => void;
  limitKeys: <NewKeys extends Keys>() => SafeStore<T, NewKeys>;
}
