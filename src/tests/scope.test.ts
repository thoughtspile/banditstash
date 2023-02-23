import { suite as makeSuite } from "uvu";
import { equal, is, throws } from "uvu/assert";
import { scope, makeBanditStash } from "../index.js";
import { memoryStorage } from "./memoryStorage.js";

const { data, storage } = memoryStorage();
const suite = makeSuite("scope");
suite.before.each(() => data.clear());
const stash = makeBanditStash(storage).use(scope("prefix"));

suite("getItem", () => {
  data.set("prefix:breakfast", "beer");
  equal(stash.getItem("breakfast"), "beer");
});
suite("setItem", () => {
  stash.setItem("breakfast", "beer");
  is(data.get("prefix:breakfast"), "beer");
});
suite("removeItem", () => {
  data.set("prefix:breakfast", "beer");
  stash.removeItem("breakfast");
  is(data.has("prefix:breakfast"), false);
});

suite("chaining", () => {
  const sub = stash.use(scope("sub"));
  sub.setItem("key", "sub-value");
  is(data.get("prefix:sub:key"), "sub-value");
  is(sub.getItem("key"), "sub-value");
  sub.removeItem("key");
  is(data.has("prefix:sub:key"), false);
});

suite("chaining singleton", () => {
  const secret = stash.singleton("secret");
  secret.setItem("secret-value");
  is(data.get("prefix:secret"), "secret-value");
  is(secret.getItem(), "secret-value");
  secret.removeItem();
  is(data.has("prefix:secret"), false);
});

suite.run();
