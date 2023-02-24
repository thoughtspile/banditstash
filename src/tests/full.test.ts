import { suite } from "uvu";
import { equal, is, throws } from "uvu/assert";
import { fail, banditStash } from "../index.js";
import { memoryStorage } from "./memoryStorage.js";

const { data, storage } = memoryStorage();
const full = suite("default factory");
full.before.each(() => data.clear());

const fallback = () => new Set([0]);
const setStash = banditStash<Set<number>>({
  storage,
  prepare: (set) => Array.from(set),
  parse: (raw) =>
    Array.isArray(raw)
      ? new Set(raw.filter((x): x is number => typeof x === "number"))
      : fail(),
  fallback,
});

full("setItem", () => {
  const set = new Set([10, 11]);
  setStash.setItem("secret", set);
  is(data.has("secret"), true);
});
full("getItem", () => {
  const set = new Set([10, 11]);
  setStash.setItem("secret", set);
  equal(setStash.getItem("secret"), set);
});
full("removeItem", () => {
  setStash.setItem("secret", new Set([10, 11]));
  setStash.removeItem("secret");
  is(data.has("secret"), false);
});
full.run();

const fallbackSuite = suite("fallback");
fallbackSuite.before.each(() => data.clear());
fallbackSuite("fallback on missing", () => {
  equal(setStash.getItem("miss"), fallback());
});
fallbackSuite("fallback on bad JSON", () => {
  data.set("bad", "[[{");
  equal(setStash.getItem("bad"), fallback());
});
fallbackSuite("fallback on parse error", () => {
  data.set("bad", JSON.stringify({ hello: "world" }));
  equal(setStash.getItem("bad"), fallback());
});

const unsafeGet = banditStash<Set<number>>({
  storage,
  prepare: (set) => Array.from(set),
  parse: (raw) =>
    Array.isArray(raw)
      ? new Set(raw.filter((x): x is number => typeof x === "number"))
      : fail(),
  fallback: false,
});
fallbackSuite("throw on missing w/ fallback: false", () => {
  throws(() => unsafeGet.getItem("bad"));
});
fallbackSuite("throw on bad JSON w/ fallback: false", () => {
  data.set("bad", "[[{");
  throws(() => unsafeGet.getItem("bad"));
});
fallbackSuite("throw on parse error w/ fallback: false", () => {
  data.set("bad", JSON.stringify({ hello: "world" }));
  throws(() => unsafeGet.getItem("bad"));
});
fallbackSuite.run();

const safeSetSuite = suite("safeSet");
safeSetSuite.before.each(() => data.clear());
safeSetSuite("ignores error", () => {
  const stash = banditStash<unknown>({
    storage,
    prepare: () => {
      throw new Error();
    },
    fallback: false,
  });
  stash.setItem("bad", "");
});

safeSetSuite("throw on prepare error w/ safeSet: false", () => {
  const stash = banditStash<unknown>({
    storage,
    prepare: () => {
      throw new Error();
    },
    fallback: false,
    safeSet: false,
  });
  throws(() => stash.setItem("bad", ""));
});
safeSetSuite.run();

const scopeSuite = suite("scope");
scopeSuite("allows scope", () => {
  const stash = banditStash<string>({
    storage,
    parse: String,
    fallback: false,
    scope: "prefix",
  });
  stash.setItem("key", "sub-value");
  is(data.get("prefix:key"), '"sub-value"');
  is(stash.getItem("key"), "sub-value");
  stash.removeItem("key");
  is(data.has("prefix:key"), false);
});
scopeSuite.run();

const noStorageSuite = suite("missing storage");
noStorageSuite("can be constructed", () => {
  banditStash<string>({
    storage: undefined,
    parse: String,
    fallback: false,
  });
});
noStorageSuite("all methods throw", () => {
  const noStorage = banditStash({
    storage: undefined,
    parse: String,
    fallback: false,
    safeSet: false,
  });
  throws(() => noStorage.getItem("key"));
  throws(() => noStorage.setItem("key", "value"));
  throws(() => noStorage.removeItem("key"));
});
noStorageSuite.run();
