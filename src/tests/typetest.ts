import { safeStore } from "../index.js";

// happy path
const numberStore = safeStore.json<number>({
  fallback: () => 0,
  parse: (raw) => (typeof raw === "number" ? raw : 0),
  prepare: (raw) => raw,
  storage: localStorage,
});
// getItem is typed
const v: number = numberStore.getItem("");
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
safeStore.json<number>({
  storage: {
    getItem: (_key: string) => "",
    setItem: (_key: string, _value: string) => {},
  },
  fallback: () => 0,
  parse: (raw) => (typeof raw === "number" ? raw : 0),
  prepare: (raw) => raw,
});

/*** accepts false fallback ***/
safeStore.json<number>({
  fallback: false,
  parse: (raw) => (typeof raw === "number" ? raw : 0),
  prepare: (raw) => raw,
  storage: localStorage,
});
safeStore<string>({
  fallback: false,
  parse: (raw) => raw,
  prepare: (raw) => raw,
  storage: localStorage,
});

/*** custom serializer ***/
// happy path
safeStore<number>({
  storage: localStorage,
  prepare: (raw) => String(raw),
  parse: (raw: string) => Number(raw),
  fallback: () => 0,
});

// prepare must return string
safeStore<number>({
  // @ts-expect-error
  prepare: (raw) => raw,
});

/*** Strict keys ***/
safeStore<string>({
  scope: "app",
  fallback: false,
  parse: (raw) => raw,
  prepare: (raw) => raw,
  storage: localStorage,
});

// chaining
safeStore<number>({
  storage: safeStore<string>({
    storage: localStorage,
    fallback: false,
    parse: (raw) => raw,
    prepare: (raw) => raw,
  }),
  fallback: false,
  parse: (raw) => Number(raw),
  prepare: (num) => String(num),
});
