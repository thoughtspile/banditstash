import { test } from "uvu";
import { z } from 'zod';
import { object, string, number, min, type Infer } from 'superstruct';
import * as banditypes from 'banditypes';
import arson from 'arson'
import { equal, is, throws } from "uvu/assert";
import { banditStash, fail, makeBanditStash } from "../index.js";
import { memoryStorage } from "./memoryStorage.js";

const { data, storage } = memoryStorage();
test.before.each(() => data.clear());
test('can make set store', () => {
  const store = banditStash<Set<number>>({
    storage,
    parse: (raw) => {
      // parse must convert arbitrary JSON to Set<string>...
      if (Array.isArray(raw)) {
        return new Set(raw.filter((x): x is number => typeof x === 'number'));
      }
      // or throw error via fail()
      fail();
    },
    // prepare must convert Set to a JSON-serializable format
    prepare: (data) => Array.from(data),
    // If getItem can't return Set<string>
    fallback: () => new Set<number>(),
  });
  store.setItem('key', new Set([1,2,3]));
  is(data.get('key'), '[1,2,3]');
  equal(store.getItem('key'), new Set([1,2,3]));
  store.removeItem('key');
  is(data.get('key'), undefined);
  equal(store.getItem('miss'), new Set());
});

test('works with zod validator', () => {
  const rentSchema = z.object({
    price: z.number(),
    location: z.object({
      country: z.string(),
      city: z.string()
    })
  });
  const store = banditStash<z.infer<typeof rentSchema>>({
    storage,
    parse: rentSchema.parse,
    fallback: false
  });
  const sample = { price: 100, location: { country: 'israel', city: 'Tel Aviv' } };
  store.setItem('key', sample);
  is(data.get('key'), JSON.stringify(sample));
  equal(store.getItem('key'), sample);
  store.removeItem('key');
  is(data.get('key'), undefined);
  data.set('invalid', JSON.stringify({ location: sample.location }));
  throws(() => store.getItem('invalid'));
});

test('works with superstruct validator', () => {
  const rentSchema = object({
    price: min(number(), 0),
    location: object({
      country: string(),
      city: string()
    })
  });
  const store = banditStash<Infer<typeof rentSchema>>({
    storage,
    parse: raw => rentSchema.create(raw),
    fallback: false
  });
  const sample = { price: 100, location: { country: 'israel', city: 'Tel Aviv' } };
  store.setItem('key', sample);
  is(data.get('key'), JSON.stringify(sample));
  equal(store.getItem('key'), sample);
  store.removeItem('key');
  is(data.get('key'), undefined);
  data.set('invalid', JSON.stringify({ location: sample.location }));
  throws(() => store.getItem('invalid'));
});

test('works with banditypes validator', () => {
  const rentSchema = banditypes.object({
    price: banditypes.number().map(n => n >= 0 ? n : banditypes.fail()),
    location: banditypes.object({
      country: banditypes.string(),
      city: banditypes.string()
    })
  });
  const store = banditStash<banditypes.Infer<typeof rentSchema>>({
    storage,
    parse: raw => rentSchema(raw),
    fallback: false
  });
  const sample = { price: 100, location: { country: 'israel', city: 'Tel Aviv' } };
  store.setItem('key', sample);
  is(data.get('key'), JSON.stringify(sample));
  equal(store.getItem('key'), sample);
  store.removeItem('key');
  is(data.get('key'), undefined);
  data.set('invalid', JSON.stringify({ location: sample.location }));
  throws(() => store.getItem('invalid'));
});

test('works with arson serializer', () => {
  const store = makeBanditStash(storage).format<Set<number>>({
    parse: arson.parse,
    prepare: arson.stringify
  });
  store.setItem('key', new Set([1,2,3]));
  is(data.get('key'), arson.stringify(new Set([1,2,3])));
  equal(store.getItem('key'), new Set([1,2,3]));
  store.removeItem('key');
  is(data.get('key'), undefined);
  throws(() => store.getItem('miss'));
});

test.run();
