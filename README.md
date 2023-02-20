# banditstash

Banditstash is a better way to interact with localStorage and sessionStorage — fully typed, easy to get started, and infinitely tweakable.

- Tiny 
- Sane defaults
- Non-opinionated:
- Safe by default
- Maximum API compatibility with Storage for easy migration

## Table of contents

## Getting started

```ts
// For convenience, .json stores handle JSON.parse / stringify for you
const messageList = banditStash.json<Set<string>>({
  // storage is localStorage, sessionStorage or a custom object with getItem & setItem
  storage: window.sessionStorage,
  // prepare must convert Set to a JSON-serializable format
  prepare: (data) => [...data],
  parse: (raw) => {
    // parse must convert arbitrary JSON to Set<string>...
    if (Array.isArray(raw)) {
      return new Set(raw.filter((x): x is string => typeof x === 'string'));
    }
    // or throw error via a handle banditStash.fail()
    banditStash.fail();
  },
  // If getItem can't return Set<string>
  fallback: () => new Set<string>()
});
```

Now you can directly pass sets to `setItem`, banditStash handles serialization for you:

```ts
messageList.setItem('read', new Set('123', '234'));
```

By default, `setItem` never throws — not on full or missing storage, not on `prepare` errors. You can disbale this behavior by passing `safeSet: false` — useful for debugging in development, or to show an explicit error message to the user.

`getItem` is guaranteed to return `Set<string>` — either from storage, or the fallback:

```ts
const reamMessages = messageList.getItem('read');
const isMessageRead = reamMessages.has(id);
```

Fallback is used when: validation throws, JSON is invalid, or storage is missing. Fallbacks can be turned off with an explicit `fallback: false` — `getItem` will still only return `Set<string>`, but will throw on error.

If you want a Storage-style `null` for missing values, you can do it like this:

```ts
const stringStore = banditStash.json<string | null>({
  storage: window.localStorage,
  parse: raw => typeof raw === 'string' ? raw : banditStash.fail(),
  prepare: data => data,
  fallback: () => null
});
const value = stringStore.getItem('key') ?? 'default';
```

Finally, `hasItem` returns `true` whenever `getItem` would return a non-fallback value — storage exists and contains item with the given key, _and_ it's valid JSON, and validation passes.

## Key validation

## Custom serializers

If you don't want JSON serialization, you can bypass it using the base `banditStash` factory:

```ts
const stringStore = banditStash<number>({
  storage: localStorage,
  parse: raw => {
    const num = Number(raw);
    return Number.isNaN(num) ? banditStash.fail() : num;
  },
  prepare: num => String(num),
  fallback: false,
});
```

You can plug in any serialization library you want, like arson or devalue:

```ts
const dateStash = banditStash<Date | null>({
  storage: localStorage,
  parse: arson.parse,
  prepare: arson.stringify
  fallback: () => null,
});
dateStash.setItem('registered', new Date(2022, 3, 16));
const registeredAt = registeredAt.getItem('registered');
```

__Note__ that changing serialization format is a breaking change, because the old storage format is likely not readable by the new parser.

## Custom storage

Apart from the obvious 

## Chaining

A special case of bandit stashes is `banditStash<string>`, because it's fully API compatible with normal `Storage`. This means that you can plug a string stash into another stash as a storage, allowing for layering:

```ts
// this stash ignores "expired" items
const ttlStash = (ttlSec: number) => banditStash<string>({ ... });
const balanceStash = banditStash.json<number>({
  // 1 hour TTL
  storage: ttlStash(60 * 60),
  // like a normal stash
});
```

Now `balanceStash` not only ensures the value is a number, but also ignores any values set more than an hour ago. The chains can be as long as you wish, as long as the "tail" consists of string stashes.

## Cookbook

### usage with zod

Banditstash plays nicely with any validation library, as long as you `throw` (or `fail()`) on invalid values. Here's an example with zod:

```ts
const userSchema = zod.object({
  name: zod.string(),
  age: zod.number().positive(),
}).strict();
const userStore = safeStore.json<zod.infer<typeof userSchema>>({
  storage: localStorage,
  fallback: false,
  parse: raw => schema.parse(raw),
  prepare: user => user
});
userStore.setItem('me', { name: 'vladimir', age: 28 });
localStorage.set('broken', JSON.stringify({ name: 'evil' }));
try {
  userStore.getItem('broken');
} catch (err) {
  console.log('validation failed');
}
```

Any other validation library — io-ts, yup, json-schems — is similarly easy to add.

## API reference

### `banditStash<T>(options)`

### `banditStash.json<T>(options)`

### `banditStash.fail(message: string)`

### `#Store.getItem(key)`

### `#Store.hasItem(key)`

### `#Store.setItem(key, value)`
