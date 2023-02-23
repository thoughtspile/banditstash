import type { TypedStorage } from "../index.js";

export function memoryStorage() {
  const data = new Map<string, string | null>();
  const storage: TypedStorage<string | null> = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  return { data, storage };
}
