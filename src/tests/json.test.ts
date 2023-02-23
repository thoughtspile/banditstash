import { suite as makeSuite } from "uvu";
import { equal, is, throws } from "uvu/assert";
import { json, makeBanditStash } from "../index.js";
import { memoryStorage } from "./memoryStorage.js";

const { data, storage } = memoryStorage();
const suite = makeSuite("json");
suite.before.each(() => data.clear());
const stash = makeBanditStash(storage).format(json());

suite("getItem", () => {
  data.set("breakfast", JSON.stringify({ beer: true }));
  equal(stash.getItem("breakfast"), { beer: true });
});
suite("getItem miss", () => {
  is(stash.getItem("miss"), null);
});
suite("getItem bad JSON", () => {
  data.set("bad", "{__]");
  throws(() => stash.getItem("bad"));
});

suite("setItem", () => {
  stash.setItem("breakfast", { beer: true });
  is(data.get("breakfast"), JSON.stringify({ beer: true }));
});
suite("setItem error", () => {
  const obj = {};
  obj["loop"] = obj;
  throws(() => stash.setItem("circle", obj));
  is(data.has("circle"), false);
});

suite.run();
