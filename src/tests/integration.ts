import { test } from "uvu";
import { is, equal, throws } from "uvu/assert";
import zod from "zod";
import arson from "arson";
import { json, safeStore } from "../modular.js";
import { makeMemoryStorage } from "./memoryStorgage.js";

const { storage, storageData } = makeMemoryStorage();

let now = 0;
const ttlStore = (ttl: number) =>
  safeStore({ storage }).use<string>({
    parse: (raw) => {
      const [_, ttlString, data] = raw?.match(/^([0-9]+):(.*)/) ?? [];
      if (now > Number(ttlString) || !data) safeStore.fail();
      return data;
    },
    prepare: (data) => `${now + ttl}:${data}`,
    fallback: false,
  });

test("ttl", () => {
  const store = ttlStore(100);
  store.setItem("__key__", "__da:ta__");
  is(store.getItem("__key__"), "__da:ta__");
  now = 101;
  throws(() => store.getItem("__key__"));
});

test("ttl proxy", () => {
  now = 0;
  const objectTtl = ttlStore(100)
    .use(json())
    .use({
      fallback: () => ({ name: "__fallback__" }),
      parse: (raw) => {
        return raw &&
          typeof raw === "object" &&
          "name" in raw &&
          typeof raw["name"] === "string"
          ? { name: raw.name }
          : safeStore.fail();
      },
      prepare: (raw) => raw,
    });
  objectTtl.setItem("__key__", { name: "me" });
  equal(objectTtl.getItem("__key__"), { name: "me" });
  now = 101;
  equal(objectTtl.getItem("__key__"), { name: "__fallback__" });
});

test("zod", () => {
  const schema = zod
    .object({
      name: zod.string(),
      age: zod.number().positive(),
    })
    .strict();
  const userStore = safeStore({ storage })
    .use(json())
    .use<zod.infer<typeof schema>>({
      parse: (raw) => schema.parse(raw),
      prepare: (raw) => raw,
      fallback: () => ({ name: "__fallback__", age: 20 }),
    });
  userStore.setItem("me", { name: "vladimir", age: 28 });
  equal(userStore.getItem("me"), { name: "vladimir", age: 28 });
  storageData.set("broken", JSON.stringify({ name: "evil" }));
  equal(userStore.getItem("broken"), { name: "__fallback__", age: 20 });
});

test("arson", () => {
  const registered = safeStore({ storage }).use<Date>({
    fallback: () => new Date(),
    parse: arson.parse,
    prepare: arson.stringify,
  });
  const date = new Date(2022, 3, 16);
  registered.setItem("reg", date);
  equal(registered.getItem("reg"), date);
});

test.run();
