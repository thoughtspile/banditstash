const id = <T>(v: T) => v;

export function safeStore<StorageType>(storage: TypedStorage<StorageType>): SafeStore<StorageType> {
  return {
    getItem: storage.getItem.bind(storage),
    setItem: storage.setItem.bind(storage),
    singleton: (key) => ({
      getItem: storage.getItem.bind(null, key),
      setItem: storage.setItem.bind(null, key),
    }),
    format: options => safeStore({
      getItem: (key) => (options.parse || id)(storage.getItem(key)),
      setItem: (key, value) => storage.setItem(key, (options.prepare || id)(value)),
    }),
    use: (options) => safeStore(options(storage)),
  };
}

export const json = () => ({
  parse: (raw: string | null): Json => raw ? JSON.parse(raw) : fail(),
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

type ParserOptions<Outer, Inner> = 
  ([Inner] extends [Outer] ? { parse?: (rawValue: Inner) => Outer; } : { parse: (rawValue: Inner) => Outer; }) &
  ([Outer] extends [Inner] ? { prepare?: (rawValue: Outer) => Inner; } : { prepare: (rawValue: Outer) => Inner; });

type Plugin<In, Out> = (store: TypedStorage<In>) => TypedStorage<Out>;

export interface SafeStore<T> extends TypedStorage<T> {
  singleton: <Key extends string>(key: Key) => SingletonStore<T>;
  use: <Outer>(options: Plugin<T, Outer>) => SafeStore<Outer>;
  format: <Outer>(options: ParserOptions<Outer, T>) => SafeStore<Outer>;
}

export interface SingletonStore<T> {
  getItem: () => T;
  setItem: (value: T) => void;
}

window['ds'] = safeStore(localStorage)
  .use(scope('app'))
  .format(json())
  .format<number>({
    parse: data => typeof data === 'number' ? data : fail(),
  })
  .use(safeGet(() => 0))
  .use(safeSet());