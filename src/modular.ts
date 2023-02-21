const id = <T>(v: T) => v;

export function safeStore<T>(storage: TypedStorage<T>): SafeStore<T> {
  return {
    getItem: storage.getItem.bind(storage),
    setItem: storage.setItem.bind(storage),
    singleton: (key) => ({
      getItem: storage.getItem.bind(storage, key),
      setItem: storage.setItem.bind(storage, key),
    }),
    format: (options) =>
      safeStore({
        getItem: (key) => (options.parse || id)(storage.getItem(key)),
        setItem: (key, value) =>
          storage.setItem(key, (options.prepare || id)(value)),
      }),
    use: (options) => safeStore(options(storage)),
  };
}

export const json = () => ({
  parse: JSON.parse as (raw: string | null) => Json,
  prepare: JSON.stringify as (data: Json) => string,
});

export function scope<T>(prefix: string): Plugin<T, T> {
  return (storage) => ({
    getItem: (key) => storage.getItem(prefix + ":" + key),
    setItem: (key, value) => storage.setItem(prefix + ":" + key, value),
  });
}

export function safeGet<T>(fallback: () => T): Plugin<T, T> {
  return (store) => ({
    getItem: (key) => {
      try {
        return store.getItem(key);
      } catch (err) {
        return fallback();
      }
    },
    setItem: store.setItem,
  });
}

export function safeSet<T>(): Plugin<T, T> {
  return (store) => ({
    getItem: store.getItem,
    setItem: (key, value) => {
      try {
        store.setItem(key, value);
      } catch (err) {}
    },
  });
}

export function fail(message?: string): never {
  throw new TypeError(message || "BanditStore parse failed");
}

/** types */
type Primitive = string | number | boolean | null | undefined;
export type Json = Primitive | Json[] | { [key: string]: Json };

export interface SafeStore<T> extends TypedStorage<T> {
  singleton: <Key extends string>(key: Key) => SingletonStore<T>;
  use: <Outer>(plugin: Plugin<T, Outer>) => SafeStore<Outer>;
  format: <Outer>(formatter: Formatter<T, Outer>) => SafeStore<Outer>;
}

interface TypedStorage<ItemType> {
  getItem: (key: string) => ItemType;
  setItem: (key: string, value: ItemType) => void;
}

export type Formatter<Inner, Outer> = ([Inner] extends [Outer]
  ? { parse?: (rawValue: Inner) => Outer }
  : { parse: (rawValue: Inner) => Outer }) &
  ([Outer] extends [Inner]
    ? { prepare?: (rawValue: Outer) => Inner }
    : { prepare: (rawValue: Outer) => Inner });

export type Plugin<In, Out> = (store: TypedStorage<In>) => TypedStorage<Out>;

export interface SingletonStore<T> {
  getItem: () => T;
  setItem: (value: T) => void;
}

export function banditStash<T>(options) {
  let store = safeStore(options.storage).format(json()).format<T>({
    parse: options.parse,
    prepare: options.prepare,
  });
  options.fallback && (store = store.use(safeGet(options.fallback)));
  options.safeSet && (store = store.use(safeSet()));
  options.scope && (store = store.use(scope(options.scope)));
  return store;
}
