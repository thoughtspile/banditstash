export function safeStore<T>(options: SafeStoreOptions<T, string>) {
  const { storage, parse, prepare, fallback, safeSet = true, scope } = options;
  const getKey = (key: string) => (scope ? scope + ":" + key : key);
  const store: SafeStore<T> = {
    getItem: (key) => {
      try {
        const raw = storage.getItem(getKey(key));
        return raw == null ? safeStore.fail() : parse(raw);
      } catch (err) {
        if (fallback) return fallback();
        throw err;
      }
    },
    setItem: (key, value) => {
      try {
        storage.setItem(getKey(key), prepare(value));
      } catch (err) {
        if (!safeSet) throw err;
      }
    },
    singleton: (key) => ({
      getItem: store.getItem.bind(null, key),
      setItem: store.setItem.bind(null, key),
    }),
    scope: (prefix) => safeStore({ ...options, scope: getKey(prefix) }),
  };
  return store;
}

safeStore.json = function jsonStore<T>(options: SafeStoreOptions<T, Json>) {
  return safeStore<T>({
    ...options,
    parse: (data) => options.parse(JSON.parse(data)),
    prepare: (data) => JSON.stringify(options.prepare(data)),
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
  scope?: string;
}

export interface SafeStore<T> {
  getItem: (key: string) => T;
  setItem: (key: string, value: T) => void;
  singleton: <Key extends string>(key: Key) => SingletonStore<T>;
  scope: (prefix: string) => SafeStore<T>;
}

export interface SingletonStore<T> {
  getItem: () => T;
  setItem: (value: T) => void;
}
