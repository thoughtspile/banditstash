import { suite, test } from "uvu";
import { is, throws } from "uvu/assert";
import { safeStore, type Json, type SafeStoreOptions } from "../index.js";

const storageData = new Map<string, string>();
const storage: SafeStoreOptions<unknown, unknown>["storage"] = {
  getItem: (key) => storageData.get(key) ?? null,
  setItem: (key, value) => storageData.set(key, value),
};
function safeStringStore(options: Partial<SafeStoreOptions<string, Json>> = {}) {
  return safeStore.json<string>({
    storage,
    fallback: () => "__fallback__",
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


const testGetItemUnsafe = suite('getItem with no fallback');
testGetItemUnsafe("parses input", () => {
  const store = safeStringStore({
    parse: (raw) => (typeof raw == "string" ? `parsed:${raw}` : safeStore.fail()),
    fallback: false
  });
  storageData.set("__key__", JSON.stringify("__value__"));
  is(store.getItem("__key__"), "parsed:__value__");
});
testGetItemUnsafe("throws on missing storage", () => {
  const store = safeStringStore({ storage: undefined as any, fallback: false });
  throws(() => store.getItem("key"));
});
testGetItemUnsafe("throws on missing value", () => {
  const store = safeStringStore({ fallback: false });
  throws(() => store.getItem("__miss__"));
});
testGetItemUnsafe("throws on invalid JSON", () => {
  const store = safeStringStore({ fallback: false });
  storageData.set("__key__", "__non_json__");
  throws(() => store.getItem("__key__"));
});
testGetItemUnsafe("throws on validation throw", () => {
  const store = safeStringStore({ fallback: false });
  storageData.set("__key__", JSON.stringify({}));
  throws(() => store.getItem("__key__"));
});
testGetItemUnsafe.run();


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
  const store = safeStore.json<any>({
    storage,
    fallback: () => ({}),
    parse: (raw) => raw,
    prepare: (raw) => raw,
  });
  const circular = {};
  circular["key"] = circular;
  store.setItem("__key__", circular);
});
testSetItem.run();


const testUnsafeSetItem = suite('setItem unsafe');
testUnsafeSetItem("serializes input", () => {
  const store = safeStringStore({
    safeSet: false,
    prepare: (raw) => `prepared:${raw}`,
  });
  store.setItem("__key__", "__value__");
  is(storageData.get("__key__"), JSON.stringify("prepared:__value__"));
});
testUnsafeSetItem("ignores missing storage", () => {
  const store = safeStringStore({ storage: undefined as any, safeSet: false });
  throws(() => store.setItem("__key__", "9"));
});
testUnsafeSetItem("ignores setItem throw", () => {
  const store = safeStringStore({
    safeSet: false,
    storage: {
      ...storage,
      setItem: () => {
        throw new Error("full");
      },
    },
  });
  throws(() => store.setItem("__key__", "9"));
});
testUnsafeSetItem("ignores non-serializable data", () => {
  const store = safeStore.json<any>({
    safeSet: false,
    storage,
    fallback: () => ({}),
    parse: (raw) => raw,
    prepare: (raw) => raw,
  });
  const circular = {};
  circular["key"] = circular;
  throws(() => store.setItem("__key__", circular));
});
testUnsafeSetItem.run();


const testCustomSerializer = suite("custom serializer");
testCustomSerializer("stores result as-is", () => {
  const store = safeStore<string>({
    storage,
    fallback: () => "",
    parse: (raw) => `parsed:${raw}`,
    prepare: (num) => `prepared:${num}`,
  });
  store.setItem("__key__", "__data__");
  is(storageData.get("__key__"), "prepared:__data__");
});
testCustomSerializer("gets result as-is", () => {
  const store = safeStore<string>({
    storage,
    fallback: () => "",
    parse: (raw) => `parsed:${raw}`,
    prepare: (num) => `prepared:${num}`,
  });
  storageData.set("__key__", "__data__");
  is(store.getItem("__key__"), "parsed:__data__");
});
testCustomSerializer.run();
