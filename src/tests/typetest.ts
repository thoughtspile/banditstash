import { safeStore } from "../index.js";

// happy path
const numberStore = safeStore<number>({
  defaultValue: () => 0,
  parse: (raw) => (typeof raw === "number" ? raw : 0),
  prepare: (raw) => raw,
  storage: localStorage,
});
// getItem is typed
const v: number = numberStore.getItem("");
// hasItem returns boolean
const has: boolean = numberStore.hasItem("");
// setItem is typed
numberStore.setItem("", 9);
// @ts-expect-error
numberStore.setItem("", "9");

// parse must return storage type
safeStore<number>({
  // @ts-expect-error
  parse: (raw) => raw,
});

// prepare must return plain object
safeStore<Set<string>>({
  // @ts-expect-error
  prepare: (raw) => raw,
});

// accepts custom storage
safeStore<number>({
  storage: {
    getItem: (_key: string) => "",
    setItem: (_key: string, _value: string) => {},
  },
  defaultValue: () => 0,
  parse: (raw) => (typeof raw === "number" ? raw : 0),
  prepare: (raw) => raw,
});

/*** custom serializer ***/
// happy path
safeStore<number>({
  storage: localStorage,
  json: false,
  prepare: (raw) => String(raw),
  parse: (raw: string) => Number(raw),
  defaultValue: () => 0,
});

// prepare must return string
// @ts-expect-error
safeStore<number>({
  json: false,
  prepare: (raw) => raw,
});
