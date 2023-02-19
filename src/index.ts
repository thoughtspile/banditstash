type Json =
  | string
  | number
  | boolean
  | null
  | undefined
  | Json[]
  | { [key: string]: Json };

export interface SafeStoreOptions<T> {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  defaultValue: () => T;
  parse: (rawValue: Json) => T;
  prepare: (rawValue: T) => Json;
}

export interface SafeStore<T> {
  getItem: (key: string) => T;
  set: (key: string, value: T) => void;
  remove: (key: string) => void;
}

export function safeStore<T>(options: SafeStoreOptions<T>): SafeStore<T> {
  return {} as SafeStore<T>;
}
