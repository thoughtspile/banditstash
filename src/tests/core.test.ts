import { suite } from "uvu";
import { is, throws } from "uvu/assert";
import { fail, makeBanditStash } from "../index.js";
import { memoryStorage } from "./memoryStorage.js";

const { data, storage } = memoryStorage();
const core = suite("core");
core.before.each(() => data.clear());

core("getItem", () => {
  data.set("breakfast", "beer");
  is(makeBanditStash(storage).getItem("breakfast"), "beer");
});
core("getItem miss", () => {
  is(makeBanditStash(storage).getItem("miss"), null);
});
core("getItem binding", () => {
  data.set("breakfast", "beer");
  const { getItem } = makeBanditStash(storage);
  is(getItem("breakfast"), "beer");
});

core("setItem", () => {
  makeBanditStash(storage).setItem("breakfast", "beer");
  is(data.get("breakfast"), "beer");
});
core("setItem binding", () => {
  const { setItem } = makeBanditStash(storage);
  setItem("breakfast", "beer");
  is(data.get("breakfast"), "beer");
});

core("removeItem", () => {
  data.set("breakfast", "beer");
  makeBanditStash(storage).removeItem("breakfast");
  is(data.has("breakfast"), false);
});
core("removeItem binding", () => {
  data.set("breakfast", "beer");
  const { removeItem } = makeBanditStash(storage);
  removeItem("breakfast");
  is(data.has("breakfast"), false);
});

core("format parses item", () => {
  data.set("breakfast", "beer");
  const res = makeBanditStash(storage)
    .format<string>({ parse: (data) => `parsed:${data}` })
    .getItem("breakfast");
  is(res, "parsed:beer");
});
core("format parse fail throws error", () => {
  const res = makeBanditStash(storage).format<string>({ parse: () => fail() });
  throws(() => res.getItem("key"), TypeError, "BanditStore");
});
core("format prepares item", () => {
  makeBanditStash(storage)
    .format<string | null>({ prepare: (data) => `prepared:${data}` })
    .setItem("breakfast", "beer");
  is(data.get("breakfast"), "prepared:beer");
});
core("format: parse & prepare are optional", () => {
  const noopFmt = makeBanditStash(storage).format<string | null>({});
  noopFmt.setItem("hello", "beer");
  is(data.get("hello"), "beer");
  is(noopFmt.getItem("hello"), "beer");
});

core("use maps methods", () => {
  const stash = makeBanditStash(storage).use((store) => ({
    getItem: () => "get-trick",
    setItem: () => "set-trick",
    removeItem: () => "remove-trick",
  }));
  is(stash.getItem("any"), "get-trick");
  is(stash.setItem("any", "any"), "set-trick");
  is(stash.removeItem("any"), "remove-trick");
});

core("singleton", () => {
  const stash = makeBanditStash(storage).singleton("secret");
  stash.setItem("secret:value");
  is(data.get("secret"), "secret:value");
  is(stash.getItem(), "secret:value");
  stash.removeItem();
  is(data.has("secret"), false);
});

core.run();
