const id = <T>(v: T) => v;

export function makeBanditStash<T>(storage: TypedStorage<T>) {
  const store: BanditStash<T> = {
    getItem: storage.getItem.bind(storage),
    setItem: storage.setItem.bind(storage),
    removeItem: storage.removeItem.bind(storage),

    format: (options) =>
      makeBanditStash({
        getItem: (key) => (options.parse || id)(storage.getItem(key)),
        setItem: (key, value) => storage.setItem(key, (options.prepare || id)(value)),
        removeItem: store.removeItem,
      }),
    use: (options) => makeBanditStash(options(store)),

    singleton: (key) => ({
      getItem: storage.getItem.bind(storage, key),
      setItem: storage.setItem.bind(storage, key),
      removeItem: storage.removeItem.bind(storage, key),
    }),
  };
  return store;
}

export const json = () => ({
  parse: JSON.parse as (raw: string | null) => Json,
  prepare: JSON.stringify as (data: Json) => string,
});

export function scope<T>(prefix: string): BanditPlugin<T, T> {
  return (storage) => ({
    getItem: (key) => storage.getItem(prefix + ":" + key),
    setItem: (key, value) => storage.setItem(prefix + ":" + key, value),
    removeItem: key => storage.removeItem(prefix + ":" + key),
  });
}

export function safeGet<T>(fallback: () => T): BanditPlugin<T, T> {
  return (store) => ({
    getItem: (key) => {
      try {
        return store.getItem(key);
      } catch (err) {
        return fallback();
      }
    },
    setItem: store.setItem,
    removeItem: store.removeItem,
  });
}

export function safeSet<T>(): BanditPlugin<T, T> {
  return (store) => ({
    setItem: (key, value) => {
      try {
        store.setItem(key, value);
      } catch (err) {}
    },
    getItem: store.getItem,
    removeItem: store.removeItem,
  });
}

export function fail(message = "BanditStore error"): never {
  throw new TypeError(message);
}

/** types */
type Primitive = string | number | boolean | null | undefined;
export type Json = Primitive | Json[] | { [key: string]: Json };

export interface BanditStash<T> extends TypedStorage<T> {
  singleton: <Key extends string>(key: Key) => SingletonStore<T>;
  use: <Outer>(plugin: BanditPlugin<T, Outer>) => BanditStash<Outer>;
  format: <Outer>(formatter: BanditFormatter<T, Outer>) => BanditStash<Outer>;
}

export interface TypedStorage<ItemType> {
  getItem: (key: string) => ItemType;
  setItem: (key: string, value: ItemType) => void;
  removeItem: (key: string) => void;
}

export type BanditFormatter<Inner, Outer> = ([Inner] extends [Outer]
  ? { parse?: (rawValue: Inner) => Outer }
  : { parse: (rawValue: Inner) => Outer }) &
  ([Outer] extends [Inner]
    ? { prepare?: (rawValue: Outer) => Inner }
    : { prepare: (rawValue: Outer) => Inner });

export type BanditPlugin<In, Out> = (store: BanditStash<In>) => TypedStorage<Out>;

export interface SingletonStore<T> {
  getItem: () => T;
  setItem: (value: T) => void;
  removeItem: () => void;
}


export function banditStash<T>(options: BanditStashOptions<T>) {
  let store = makeBanditStash(options.storage).format(json()).format<T>(options);
  options.scope && (store = store.use(scope(options.scope)));
  options.fallback && (store = store.use(safeGet(options.fallback)));
  (options.safeSet !== false) && (store = store.use(safeSet()));
  return store;
}

export type BanditStashOptions<T> = BanditFormatter<Json, T> & {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  scope?: string;
  fallback: false | (() => T);
  safeSet?: boolean;
}