import { suite, test } from "uvu";
import { is } from "uvu/assert";
import { safeStore, type Json, type SafeStoreOptions } from "../index.js";

const storageData = new Map<string, string>();
const storage: SafeStoreOptions<unknown, unknown>["storage"] = {
  getItem: (key) => storageData.get(key) ?? null,
  setItem: (key, value) => storageData.set(key, value),
};
test.before(() => storageData.clear());
function safeStringStore(options: Partial<SafeStoreOptions<string, Json>> = {}) {
  return safeStore.json<string>({
    storage,
    defaultValue: () => "__fallback__",
    parse: (raw) => (typeof raw === "string" ? raw : safeStore.fail()),
    prepare: (raw) => raw,
    ...options,
  });
}

const testGetItem = suite("getItem");
testGetItem("parses input", () => {
  const store = safeStringStore({
    parse: (raw) => (typeof raw == "string" ? `parsed:${raw}` : safeStore.fail()),
  });
  storageData.set("__key__", JSON.stringify("__value__"));
  is(store.getItem("__key__"), "parsed:__value__");
});
testGetItem("fallback on missing storage", () => {
  const store = safeStringStore({ storage: undefined as any });
  is(store.getItem("key"), "__fallback__");
});
testGetItem("fallback on missing value", () => {
  const store = safeStringStore();
  is(store.getItem("__miss__"), "__fallback__");
});
testGetItem("fallback on invalid JSON", () => {
  const store = safeStringStore();
  storageData.set("__key__", "__non_json__");
  is(store.getItem("__key__"), "__fallback__");
});
testGetItem("fallback on validation throw", () => {
  const store = safeStringStore();
  storageData.set("__key__", JSON.stringify({}));
  is(store.getItem("__key__"), "__fallback__");
});
testGetItem.run();

const testHasItem = suite("hasItem");
testHasItem("true on good value", () => {
  const store = safeStringStore();
  storageData.set("__key__", JSON.stringify("__value__"));
  is(store.hasItem("__key__"), true);
});
testHasItem("false on missing storage", () => {
  const store = safeStringStore({ storage: undefined as any });
  is(store.hasItem("key"), false);
});
testHasItem("false on missing value", () => {
  const store = safeStringStore();
  is(store.hasItem("__miss__"), false);
});
testHasItem("false on invalid JSON", () => {
  const store = safeStringStore();
  storageData.set("__key__", "__non_json__");
  is(store.hasItem("__key__"), false);
});
testHasItem("false on validation throw", () => {
  const store = safeStringStore();
  storageData.set("__key__", JSON.stringify({}));
  is(store.hasItem("__key__"), false);
});
testHasItem.run();

const testSetItem = suite("setItem");
testSetItem("serializes input", () => {
  const store = safeStringStore({
    prepare: (raw) => `prepared:${raw}`,
  });
  store.setItem("__key__", "__value__");
  is(storageData.get("__key__"), JSON.stringify("prepared:__value__"));
});
testSetItem("ignores missing storage", () => {
  const store = safeStringStore({ storage: undefined as any });
  store.setItem("__key__", "9");
});
testSetItem("ignores setItem throw", () => {
  const store = safeStringStore({
    storage: {
      ...storage,
      setItem: () => {
        throw new Error("full");
      },
    },
  });
  store.setItem("__key__", "9");
});
testSetItem("ignores non-serializable data", () => {
  const store = safeStore<any>({
    storage,
    defaultValue: () => ({}),
    parse: (raw) => raw,
    prepare: (raw) => raw,
  });
  const circular = {};
  circular["key"] = circular;
  store.setItem("__key__", circular);
});
testSetItem.run();

const testCustomSerializer = suite("custom serializer");
testCustomSerializer("stores result as-is", () => {
  const store = safeStore<string>({
    storage,
    defaultValue: () => "",
    parse: (raw) => `parsed:${raw}`,
    prepare: (num) => `prepared:${num}`,
  });
  store.setItem("__key__", "__data__");
  is(storageData.get("__key__"), "prepared:__data__");
});
testCustomSerializer("gets result as-is", () => {
  const store = safeStore<string>({
    storage,
    defaultValue: () => "",
    parse: (raw) => `parsed:${raw}`,
    prepare: (num) => `prepared:${num}`,
  });
  storageData.set("__key__", "__data__");
  is(store.getItem("__key__"), "parsed:__data__");
});
testCustomSerializer.run();
