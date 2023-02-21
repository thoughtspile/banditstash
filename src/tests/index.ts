import { suite, test } from "uvu";
import { is, throws } from "uvu/assert";
import { json, safeStore } from "../modular.js";
import { makeMemoryStorage } from "./memoryStorgage.js";

const { storage, storageData } = makeMemoryStorage();
const missingStorage = undefined as unknown as Storage;
const defaultStore = () => safeStore({ storage });

const testGetItem = suite("getItem");
testGetItem("parses input", () => {
  const store = defaultStore().use<string>({
    fallback: false,
    prepare: (raw) => raw,
    parse: (raw) =>
      typeof raw == "string" ? `parsed:${raw}` : safeStore.fail(),
  });
  storageData.set("__key__", "__value__");
  is(store.getItem("__key__"), "parsed:__value__");
});
testGetItem("fallback on missing storage", () => {
  const store = safeStore({ storage: missingStorage }).use<string>({
    fallback: () => "__fallback__",
    parse: (raw) => (raw == null ? safeStore.fail() : raw),
    prepare: (raw) => raw,
  });
  is(store.getItem("key"), "__fallback__");
});
testGetItem("fallback on validation throw", () => {
  const store = defaultStore().use<string>({
    fallback: () => "__fallback__",
    parse: (raw) => (raw == null ? safeStore.fail() : raw),
    prepare: (raw) => raw,
  });
  is(store.getItem("__miss__"), "__fallback__");
});
testGetItem("fallback on invalid JSON", () => {
  const store = defaultStore()
    .use(json())
    .use<string>({
      parse: (raw) => (typeof raw === "string" ? raw : safeStore.fail()),
      prepare: (raw) => raw,
      fallback: () => "__fallback__",
    });
  storageData.set("__key__", "__non_json__");
  is(store.getItem("__key__"), "__fallback__");
});
testGetItem.run();

const testGetItemUnsafe = suite("getItem with no fallback");
testGetItemUnsafe("parses input", () => {
  const store = defaultStore().use<string>({
    prepare: (raw) => raw,
    parse: (raw) =>
      typeof raw == "string" ? `parsed:${raw}` : safeStore.fail(),
    fallback: false,
  });
  storageData.set("__key__", "__value__");
  is(store.getItem("__key__"), "parsed:__value__");
});
testGetItemUnsafe("throws on missing storage", () => {
  const store = safeStore({ storage: missingStorage });
  throws(() => store.getItem("key"));
});
testGetItemUnsafe("throws on missing value", () => {
  const store = safeStore({ storage });
  throws(() => store.getItem("__miss__"));
});
testGetItemUnsafe("throws on invalid JSON", () => {
  const store = defaultStore().use(json());
  storageData.set("__key__", "__non_json__");
  throws(() => store.getItem("__key__"));
});
testGetItemUnsafe("throws on validation throw", () => {
  const store = defaultStore().use<string>({
    fallback: false,
    parse: () => safeStore.fail(),
    prepare: (raw) => raw,
  });
  storageData.set("__key__", "__value__");
  throws(() => store.getItem("__key__"));
});
testGetItemUnsafe.run();

const testSetItem = suite("setItem");
testSetItem("serializes input", () => {
  const store = defaultStore().use<string>({
    parse: (raw) => (raw == null ? safeStore.fail() : raw),
    prepare: (raw) => `prepared:${raw}`,
    fallback: false,
  });
  store.setItem("__key__", "__value__");
  is(storageData.get("__key__"), "prepared:__value__");
});
testSetItem("ignores missing storage", () => {
  const store = safeStore({ storage: missingStorage });
  store.setItem("__key__", "9");
});
testSetItem("ignores setItem throw", () => {
  const store = safeStore({
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
  const store = defaultStore().use(json());
  const circular = {};
  circular["key"] = circular;
  store.setItem("__key__", circular);
});
testSetItem.run();

const testUnsafeSetItem = suite("setItem unsafe");
testUnsafeSetItem("serializes input", () => {
  const store = safeStore({ storage, safeSet: false }).use({
    parse: (raw) => (raw == null ? safeStore.fail() : raw),
    prepare: (raw) => `prepared:${raw}`,
    fallback: false,
  });
  store.setItem("__key__", "__value__");
  is(storageData.get("__key__"), "prepared:__value__");
});
testUnsafeSetItem("throws on missing storage", () => {
  const store = safeStore({ storage: missingStorage, safeSet: false });
  throws(() => store.setItem("__key__", "9"));
});
testUnsafeSetItem("throws on setItem throw", () => {
  const store = safeStore({
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
testUnsafeSetItem("throws on non-serializable data", () => {
  const store = safeStore({
    safeSet: false,
    storage,
  }).use(json());
  const circular = {};
  circular["key"] = circular;
  throws(() => store.setItem("__key__", circular));
});
testUnsafeSetItem.run();

const testCustomSerializer = suite("custom serializer");
testCustomSerializer("stores result as-is", () => {
  const store = safeStore({ storage }).use<string>({
    fallback: false,
    parse: (raw) => `parsed:${raw}`,
    prepare: (num) => `prepared:${num}`,
  });
  store.setItem("__key__", "__data__");
  is(storageData.get("__key__"), "prepared:__data__");
});
testCustomSerializer("gets result as-is", () => {
  const store = safeStore({ storage }).use<string>({
    fallback: false,
    parse: (raw) => `parsed:${raw}`,
    prepare: (num) => `prepared:${num}`,
  });
  storageData.set("__key__", "__data__");
  is(store.getItem("__key__"), "parsed:__data__");
});
testCustomSerializer.run();

const testScope = suite("scope");
testScope("adds prefix on getItem", () => {
  const store = safeStore({ storage, scope: "prefix" });
  storageData.set("prefix:data", "__value__");
  is(store.getItem("data"), "__value__");
});
testScope("adds prefix on setItem", () => {
  const store = safeStore({ storage, scope: "prefix" });
  store.setItem("new", "__value__");
  is(storageData.get("prefix:new"), "__value__");
});
testScope("generates sub-prefix", () => {
  const store = safeStore({ storage, scope: "prefix" }).scope("second");
  storageData.set("prefix:second:data", "__value__");
  is(store.getItem("data"), "__value__");
  store.setItem("deep", "__value__");
  is(storageData.get("prefix:second:deep"), "__value__");
});
testScope("enables up scope via method", () => {
  const store = safeStore({ storage }).scope("root");
  storageData.set("root:data", "__value__");
  is(store.getItem("data"), "__value__");
  store.setItem("deep", "__value__");
  is(storageData.get("root:deep"), "__value__");
});
testScope.run();
