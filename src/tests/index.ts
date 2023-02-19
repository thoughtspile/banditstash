import { test } from "uvu";
import { is } from "uvu/assert";
import { safeStore, type SafeStoreOptions } from "../index.js";

function setupStorage<T>(options: Omit<SafeStoreOptions<T>, "storage">) {
  const storageData = new Map<string, string>();
  const mockStorage: SafeStoreOptions<unknown>["storage"] = {
    getItem: (key) => storageData.get(key) ?? null,
    setItem: (key, value) => storageData.set(key, value),
    removeItem: (key) => storageData.delete(key),
  };
  const store = safeStore<T>({ ...options, storage: mockStorage });
  return { store, storageData };
}

test("parses input", () => {
  const { store, storageData } = setupStorage({
    defaultValue: () => 0,
    parse: (raw) => (typeof raw === "number" ? raw : 0),
    prepare: (raw) => raw,
  });
  storageData.set("__key__", "9");
  is(store.getItem("__key__"), 9);
});

test.run();
