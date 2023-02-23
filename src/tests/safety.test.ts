import { suite as makeSuite } from "uvu";
import { equal, is, throws } from "uvu/assert";
import {
  fail,
  makeBanditStash,
  noStorage,
  safeGet,
  safeSet,
} from "../index.js";
import { memoryStorage } from "./memoryStorage.js";

const { data, storage } = memoryStorage();
const safeGetSuite = makeSuite("safeGet");
safeGetSuite.before.each(() => data.clear());

safeGetSuite("fallback on parse error", () => {
  const stash = makeBanditStash(storage)
    .format<never>({ parse: () => fail() })
    .use(safeGet(() => "__fallback__"));
  is(stash.getItem("key"), "__fallback__");
});
safeGetSuite("fallback on noStorage", () => {
  const stash = makeBanditStash(noStorage()).use(safeGet(() => "__fallback__"));
  is(stash.getItem("key"), "__fallback__");
});

safeGetSuite.run();

const safeSetSuite = makeSuite("safeGet");
safeSetSuite.before.each(() => data.clear());

const error = () => {
  throw new Error();
};
safeSetSuite("ignores setItem throw", () => {
  const stash = makeBanditStash({ ...storage, setItem: error }).use(safeSet());
  stash.setItem("key", "value");
});
safeSetSuite("ignores prepare throw", () => {
  const stash = makeBanditStash(storage)
    .format<string>({ parse: () => "", prepare: error })
    .use(safeSet());
  stash.setItem("key", "value");
});

safeSetSuite.run();
