import { makeBanditStash, type BanditFormatter } from "../index.js";

// happy path
const ok: BanditFormatter<string, number> = {
  parse: (x: string) => Number(x),
  prepare: (x: number) => String(x),
};
const returnTypesError: BanditFormatter<string, string> = {
  // @ts-expect-error
  parse: () => 9,
  // @ts-expect-error
  prepare: () => 9,
};

// @ts-expect-error
const parsePrepareRequired: BanditFormatter<string, number> = {};
// @ts-expect-error
const prepareRequired: BanditFormatter<string, number> = {
  parse: Number,
};
// @ts-expect-error
const parseRequired: BanditFormatter<string, number> = {
  prepare: String,
};

const parseOnlyOk: BanditFormatter<unknown, string> = {
  parse: String,
};

const prepareOnlyOk: BanditFormatter<string, unknown> = {
  prepare: String,
};

const eqAllowsEmpty: BanditFormatter<string, string> = {};
const eqAllowsParams: BanditFormatter<string, string> = {
  parse: () => "",
  prepare: () => "",
};

const setStash = makeBanditStash<Set<string>>(localStorage as any);
const x: Set<string> = setStash.getItem("key");
setStash.removeItem("key");
setStash.setItem("key", new Set(["10"]));
// @ts-expect-error
setStash.setItem("key", new Set([10]));
// @ts-expect-error
setStash.setItem("key", 10);
