export function safeStore<StorageType>(storage: TypedStorage<StorageType>) {
  const store: SafeStore<StorageType> = {
    getItem: storage.getItem.bind(storage),
    setItem: storage.setItem.bind(storage),
    singleton: (key) => ({
      getItem: store.getItem.bind(null, key),
      setItem: store.setItem.bind(null, key),
    }),
    use: (options) => safeStore(typeof options === 'function' ? options(store) : {
      getItem: (key) => options.parse(store.getItem(key)),
      setItem: (key, value) => store.setItem(key, options.prepare(value)),
    }),
  };
  return store;
}

export const json = () => ({
  parse: (raw: string | null): Json =>
    raw === null ? fail() : JSON.parse(raw),
  prepare: (data: Json) => JSON.stringify(data),
});

export const scope = <T>(prefix: string): Plugin<T, T> => (storage) => ({
  getItem: key => storage.getItem(prefix + ':' + key),
  setItem: (key, value) => storage.setItem(prefix + ':' + key, value),
});

export const safeGet = <T>(fallback: false | (() => T)): Plugin<T, T> => store => ({
  getItem: fallback ? (key) => {
    try {
      return store.getItem(key);
    } catch (err) {
      return fallback();
    }
  } : store.getItem,
  setItem: store.setItem,
});

export const safeSet = <T>(): Plugin<T, T> => store => ({
  getItem: store.getItem,
  setItem: (key, value) => {
    try {
      store.setItem(key, value);
    } catch (err) {}
  }
});

export const fail = function fail(message?: string): never {
  throw new TypeError(message || "BanditStore parse failed");
};

/** types */
type Primitive = string | number | boolean | null | undefined;
export type Json = Primitive | Json[] | { [key: string]: Json };

type TypedStorage<ItemType, Keys = string> = {
  getItem: [Keys] extends [never] ? () => ItemType : (key: string) => ItemType;
  setItem: [Keys] extends [never] ? (value: ItemType) => void : (key: string, value: ItemType) => void;
};

export interface ParserOptions<Outer, Inner> {
  parse: (rawValue: Inner) => Outer;
  prepare: (rawValue: Outer) => Inner;
}

type Plugin<In, Out> = (store: SafeStore<In>) => TypedStorage<Out>;

export interface SafeStore<T> extends TypedStorage<T> {
  singleton: <Key extends string>(key: Key) => SingletonStore<T>;
  use: <Outer>(options: Plugin<T, Outer> | ParserOptions<Outer, T>) => SafeStore<Outer>;
}

export interface SingletonStore<T> {
  getItem: () => T;
  setItem: (value: T) => void;
}


window['ds'] = safeStore(localStorage)
    .use(json())
    .use<number>({
      parse: data => typeof data === 'number' ? data : fail(),
      prepare: raw => raw
    })
    .use(safeGet(() => 0))
    .use(scope('app'))
    .use(safeSet());