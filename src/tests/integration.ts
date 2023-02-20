import { test } from "uvu";
import { is, equal } from "uvu/assert";
import zod from 'zod';
import arson from 'arson';
import { safeStore, fail, type SafeStoreOptions } from "../index.js";

const storageData = new Map<string, string>();
const storage: SafeStoreOptions<unknown>["storage"] = {
  getItem: (key) => storageData.get(key) ?? null,
  setItem: (key, value) => storageData.set(key, value),
};

let now = 0;
const ttlStore = (ttl: number) => safeStore<string>({
  json: false,
  parse: (raw) => {
    if (typeof raw !== 'string') fail();
    const parsed = raw.match(/^([0-9]+):(.*)/);
    if (now > Number(parsed?.[1]) || !parsed?.[2]) fail();
    return parsed?.[2];
  },
  prepare: data => `${now + ttl}:${data}`,
  defaultValue: () => '__fallback__',
  storage
});

test('ttl', () => {
  const store = ttlStore(100);
  store.setItem('__key__', '__da:ta__');
  is(store.getItem('__key__'), '__da:ta__');
  now = 101;
  is(store.getItem('__key__'), '__fallback__');
});

test('ttl proxy', () => {
  now = 0;
  const objectTtl = safeStore<{ name: string }>({
    storage: ttlStore(100),
    defaultValue: () => ({ name: '__fallback__' }),
    parse: raw => {
      return raw && typeof raw === 'object' && ('name' in raw) && typeof raw['name'] === 'string' ? { name: raw.name } : fail();
    },
    prepare: raw => raw
  });
  objectTtl.setItem('__key__', { name: 'me' });
  equal(objectTtl.getItem('__key__'), { name: 'me' });
  now = 101;
  equal(objectTtl.getItem('__key__'), { name: '__fallback__' });
});

test('zod', () => {
  const schema = zod.object({
    name: zod.string(),
    age: zod.number().positive(),
  }).strict();
  const userStore = safeStore<zod.infer<typeof schema>>({
    storage,
    defaultValue: () => ({ name: '__fallback__', age: 20 }),
    parse: raw => schema.parse(raw),
    prepare: raw => raw
  });
  userStore.setItem('me', { name: 'vladimir', age: 28 });
  equal(userStore.getItem('me'), { name: 'vladimir', age: 28 });
  storageData.set('broken', JSON.stringify({ name: 'evil' }));
  equal(userStore.getItem('broken'), { name: '__fallback__', age: 20 });
});

test('arson', () => {
  const registered = safeStore<Date>({
    json: false,
    storage,
    defaultValue: () => new Date(),
    parse: arson.parse,
    prepare: arson.stringify
  });
  const date = new Date(2022, 3, 16)
  registered.setItem('reg', date);
  equal(registered.getItem('reg'), date);
});

test.run();