export function safeStore<Storage>(options: SafeStoreOptions<Storage>) {
  const { storage, scope, safeSet = true } = options;
  const getKey = (key: string) => (scope ? scope + ":" + key : key);
  const store: SafeStore<Storage> = {
    getItem: (key) => storage.getItem(getKey(key)),
    setItem: (key, value) => {
      try {
        storage.setItem(getKey(key), value);
      } catch (err) {
        if (!safeSet) throw err;
      }
    },
    singleton: (key) => ({
      getItem: store.getItem.bind(null, key),
      setItem: store.setItem.bind(null, key),
    }),
    scope: (prefix) => safeStore({ ...options, scope: getKey(prefix) }),
    use: ({ parse, prepare, fallback }) =>
      safeStore({
        ...options,
        storage: {
          getItem: (key) => {
            try {
              return parse(store.getItem(key));
            } catch (err) {
              if (fallback) return fallback();
              throw err;
            }
          },
          setItem: (key, value) => store.setItem(key, prepare(value)),
        },
      }),
  };
  return store;
}

export const json = () => ({
  parse: (raw: string | null): Json =>
    raw === null ? safeStore.fail() : JSON.parse(raw),
  prepare: (data: Json) => JSON.stringify(data),
  fallback: false as const,
});

safeStore.fail = function fail(message?: string): never {
  throw new TypeError(message || "BanditStore parse failed");
};

/** types */
type Primitive = string | number | boolean | null | undefined;
export type Json = Primitive | Json[] | { [key: string]: Json };

export interface SafeStoreOptions<StorageType> {
  storage: {
    getItem: (key: string) => StorageType;
    setItem: (key: string, value: StorageType) => void;
  };
  safeSet?: boolean;
  scope?: string;
}

export interface ParserOptions<Outer, Inner> {
  fallback: false | (() => Outer);
  parse: (rawValue: Inner) => Outer;
  prepare: (rawValue: Outer) => Inner;
}

export interface SafeStore<T> {
  getItem: (key: string) => T;
  setItem: (key: string, value: T) => void;
  singleton: <Key extends string>(key: Key) => SingletonStore<T>;
  scope: (prefix: string) => SafeStore<T>;
  use: <Outer>(options: ParserOptions<Outer, T>) => SafeStore<Outer>;
}

export interface SingletonStore<T> {
  getItem: () => T;
  setItem: (value: T) => void;
}
