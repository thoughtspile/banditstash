import { json, safeStore } from "../modular.js";

// happy path
const numberStore = safeStore({ storage: localStorage }).use<number>({
  fallback: () => 0,
  parse: (raw) => (raw == null ? Number(raw) : safeStore.fail()),
  prepare: (raw) => String(raw),
});
// getItem is typed
const v: number = numberStore.getItem("");
// setItem is typed
numberStore.setItem("", 9);
// @ts-expect-error
numberStore.setItem("", "9");

// parse must return storage type
safeStore({ storage: localStorage }).use<number>({
  // @ts-expect-error
  parse: (raw) => raw,
});

// prepare must return plain object
safeStore({ storage: localStorage }).use<Set<string>>({
  // @ts-expect-error
  prepare: (raw) => raw,
});

// accepts custom storage
safeStore({
  storage: {
    getItem: (_key: string) => "",
    setItem: (_key: string, _value: string) => {},
  },
});

/*** accepts false fallback ***/
safeStore({ storage: localStorage }).use<number>({
  fallback: false,
  parse: () => 0,
  prepare: () => "",
});
safeStore({ storage: localStorage }).use<string>({
  // @ts-expect-error
  fallback: true,
});

/*** json module ***/
// happy path
safeStore({ storage: localStorage })
  .use(json())
  .use<number>({
    prepare: (raw) => raw,
    parse: (raw) => (typeof raw === "number" ? raw : safeStore.fail()),
    fallback: () => 0,
  });
// prepare can't return non-POJO values
safeStore({ storage: localStorage })
  .use(json())
  .use<Set<string>>({
    // @ts-expect-error
    prepare: (raw) => raw,
  });
// parse must narrow input type
safeStore({ storage: localStorage })
  .use(json())
  .use<string>({
    // @ts-expect-error
    parse: (raw) => raw,
  });

/*** Strict keys ***/
safeStore({ storage: localStorage, scope: "app" });
safeStore({ storage: localStorage }).scope("app");
const item = safeStore({ storage: localStorage }).singleton("item");
item.getItem();
item.setItem("hello");

// chaining
safeStore({ storage: localStorage })
  .use<string>({
    fallback: false,
    parse: (raw) => (typeof raw === "string" ? raw : safeStore.fail()),
    prepare: (raw) => raw,
  })
  .use<number>({
    fallback: false,
    parse: (raw) => Number(raw),
    prepare: (num) => String(num),
  });
