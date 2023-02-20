export function safeStore<T, Meta extends SafeStoreMeta = never>(
  options: SafeStoreOptions<T, string>
): SafeStore<T, GetKeys<Meta>> {
  function getItemUnsafe(key: string) {
    const raw = options.storage.getItem(key);
    return raw == null ? safeStore.fail() : options.parse(raw);
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
        options.storage.setItem(key, options.prepare(value));
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
export type Json =
  | string
  | number
  | boolean
  | null
  | undefined
  | Json[]
  | { [key: string]: Json };

type SafeStoreMeta<Keys extends string = string> = { keys: Keys };
type GetKeys<Meta> = [Meta] extends [SafeStoreMeta<infer Keys>] ? Keys : string;

export interface SafeStoreOptions<T, StorageType> {
  storage: Pick<Storage, "getItem" | "setItem">;
  defaultValue: () => T;
  parse: (rawValue: StorageType) => T;
  prepare: (rawValue: T) => StorageType;
}

export interface SafeStore<T, Keys extends string> {
  getItem: (key: Keys) => T;
  hasItem: (key: Keys) => boolean;
  setItem: (key: Keys, value: T) => void;
}
