# banditstash

A better way to interact with `localStorage` and `sessionStorage` — safe and infinitely extensible.

- __Type-safe:__ no sneaky bugs if storage is corrupted.
- __Sane defaults:__ JSON serialization, type-safe parsing, runtime safety out of the box.
- __Key scoping:__ prevent collisions and access values with ease.
- __Tiny:__ 400 bytes full build, or a 187-byte core with modular features.
- __Extensible:__ replace JSON with any serializer or use your favorite validation library.
- __Familiar API:__ no trickery, just good old getItem / setItem with stricter types.
- __Custom storage:__ not limited to local / sessionStorage.

__Beware!__ This is an early version of the package. API might change, bugs might exist.

## Install

```sh
npm install --save banditstash
```

## Basic usage

Default `banditStash` factory gives you:

- JSON serialization for convenience
- Type-safe access
- Runtime validation to prevent malformed objects from exploding at runtime
- Catching getItem / setItem errors
- Optional scoping to prevent key collisions

```ts
import { banditStash, fail } from 'banditstash';

// Passing explicit type parameter for outer type is recommended
const setStash = banditStash<Set<string>>({
  storage: window.sessionStorage,
  parse: (raw) => {
    // parse must convert arbitrary JSON to Set<string>...
    if (Array.isArray(raw)) {
      return new Set(raw.filter((x): x is string => typeof x === 'string'));
    }
    // or throw error via fail()
    fail();
  },
  // prepare must convert Set to a JSON-serializable format
  prepare: (data) => [...data],
  // If getItem can't return Set<string>
  fallback: () => new Set<string>(),
  // (optional) prefix all storage keys with "app:"
  scope: 'app'
});

// getItem always returns Set<string> — either from storage or fallback:
const readMessages: Set<string> = setStash.getItem('read-ids');
const isMessageRead = readMessages.has(id);

// setItem accepts Set<string> and serializes it for you:
setStash.setItem('read-ids', new Set('123', '234'));

// removeItem is same as in raw storage
setStash.remove('read-ids');

// Bind key with .singleton() for easy access to a sinlge item:
const readStash = setStash.singleton('read-messages');
const ids = readIds.getItem();
readIds.setItem(ids);
readIds.removeItem();
```

This setup catches errors from both `getItem` (validation fails, invalid JSON in storage, missing storage) and `setItem` (full or missing storage, failed serialization). This can be disabled with explicit `fallback: false` and `safeSet: false`, respectively — useful for debugging, or to show an explicit error message to the user.

## Custom banditStashes

`banditstash` is designed to be modular and extensible via plugins. In fact, default `banditStash` is just a combination of 3 plugins — `safeGet`, `safeSet`, and `scope` — and two formatters, `json` and your custom formatter defined via `prepare` and `parse`. __Plugins__ modify getItem / setItem / removeItem behavior (like wrapping in try / catch, changing keys, or whatever.) __Formatters__ are a special case of plugins that validate and transform the stored value during getItem and setItem.

Using the base `makeBanditStash` factory with `use` and `format` methods, you can further reduce bundle size (down to 187 bytes without plugins) or modify the behavior of your stores. Plugins and formatters are chainable and _always_ return a new object.

```ts
const stringStore = makeBanditStash(localStorage).format<string>({
  parse: data => data == null ? fail() : data
});
const readonlyStringStore = stringStore.use(stash => ({
  getItem: stash.getItem,
  setItem: () => {
    throw new Error('setItem on readonly store');
  },
  removeItem: () => {
    throw new Error('removeItem on readonly store');
  },
}));
```

Stashes built using the default factory can be further enhanced with more plugins or formatters.

### Custom storage

Banditstash is not limited to browser Storage APIs — you can provide any object with `getItem`, `setItem` and `removeItem` methods that accept string key. The values needn't be strings, and makeBanditStash will infer storage value type.

```ts
const map = new Map<string, number>();
const memoryStorage = makeBanditStash({
  getItem: (key) => map.get(key) ?? fail(),
  setItem: (key, value) => map.set(key, value),
  removeItem: (key) => map.delete(key),
});

const universalStorage = makeBanditStash(typeof window === 'undefined' ? {
  getItem: () => null,
  setItem: (() => {}),
  removeItem: (() => {}),
} : window.localStorage);
```

### Custom serializer

If JSON does not satisfy you as a storage format, you can easily use your own serializer. Here's an example of manually serializing a number:

```ts
const numberStash = makeBanditStash(localStorage).format<number>({
  parse: raw => {
    const num = Number(raw);
    return Number.isNaN(num) ? fail() : num;
  },
  prepare: String,
});
```

Any serialization library, like [arson](https://github.com/benjamn/arson) or [devalue,](https://github.com/Rich-Harris/devalue) will work:

```ts
const dateStash = makeBanditStash(localStorage).format<Date>({
  parse: arson.parse,
  prepare: arson.stringify
});
dateStash.setItem('registered', new Date(2022, 3, 16));
const registeredAt: Date = dateStash.getItem('registered');
```
For reference, the builtin JSON serialization is implemented like this:

```ts
import { makeBanditStash, json } from 'banditstash';

makeBanditStash(localStorage).format(json());
```

### Using a validation library

Banditstash plays nicely with any validation library, as long as you `throw` (or `fail()`) on invalid values. Here's an example with [zod:](https://zod.dev/)

```ts
const userSchema = zod.object({
  name: zod.string(),
  age: zod.number().positive(),
}).strict();

const userStore = banditStash(localStorage)
  .format<zod.infer<typeof userSchema>>({
    parse: raw => schema.parse(raw),
  });

userStore.setItem('me', { name: 'vladimir', age: 28 });
localStorage.set('broken', JSON.stringify({ name: 'evil' }));
try {
  userStore.getItem('broken');
} catch (err) {
  console.log('validation failed');
}
```

Any other validation library — [io-ts,](https://gcanti.github.io/io-ts/) [yup,](https://github.com/jquense/yup) etc — is similarly easy to add.

### Scoping

`scope` plugin adds prefix to all keys to avoid key collisions. It's still useful even without TypeScript:

```ts
import { makeBanditStash, scope } from 'banditstash';

const appStorage = makeBanditStash(localStorage)
  .use(scope('app'));

const userStorage = appStorage.use(scope('user'));
const cacheStorage = appStorage.use(scope('cache'));

userStorage.getItem('avatar');
// localStorage.getItem('app:user:avatar')
```

### Runtime safety

Banditstash provides two helpers for catching runtime errors: `safeGet` to handle `getItem` errors, and `safeSet` for `setItem`:

```ts
import { makeBanditStash, safeGet, safeSet, json } from 'banditstash';
const safeStorage = makeBanditStash(window.localStorage)
  .format(json())
  .use(safeGet(() => ({})))
  .use(safeSet());
```

Note that, due to chaining, `safeGet` and `safeSet` only handle errors from plugins applied _above_ them, so it's best to use these in the tail of the chain.

## API reference

### `banditStash<Data>(options)`

Creates a default stash with JSON serialization, validation and error handling. Specifying data type explicitly is recommended.

Options:
- `storage`: `localStorage`, `sessionStorage`, or an object with compatible `getItem`, `setItem`, and `removeItem` methods.
- `parse`: a function that either converts a free-form JSON to the `Data` type, or throws an error, during `getItem`. Usually required.
- `prepare`: a function that converts `Data` to a JSON-serializable object during `setItem`. Required for non-serializable types like `Date`, `Map`, `Set`, etc.
- `fallback: (() => Data) | false` : value to return when `getItem` can't retrieve data from storage. If set to false, error will be thrown.
- `safeSet?: false` (optional): if false, setItem might throw. Defaults to true.
- `scope: string`: (optional) a prefix for all the keys in the storage.

### `fail()`

A helper to conveniently throw errors in `parse`:

```ts
{
  parse: raw => raw.length === 10 ? raw : fail(),
  // equivalent to
  parse: raw => {
    if (raw.length === 10) return raw;
    throw new TypeError();
  }
}
```

### `makeBanditStash(storage)`

Creates a custom banditStash instance without formatters or plugins. `getItem`, `setItem` and `removeItem` are always bound to storage, `format`, `use` and `singleton` methods are added.

### `#BanditStash<T>.getItem(key)`

Reads value from storage, passing it through `parse` pipeline. Returns a parsed `Data` type. Throws if parse fails and `safeGet` plugin is not used.

### `#BanditStash.setItem(key, value)`

Writes value to storage, passing it through `prepare` pipeline. Throws if prepare fails or `storage.setItem` throws, and `safeSet` is not used.

### `#BanditStash.removeItem(key)`

Removes value from storage.

### `#BanditStash.singleton(key)`

Returns a singleton store whose `getItem`, `setItem` and `removeItem` can be called without key. Singleton stores don't support formatters and plugins, so make sure it's called last.

### `#BanditStash<Inner>.format<Outer>(formatter)`

Returns a new stash that exposes data of `Outer` type. Formatter object contains 2 functions:

- `parse` maps data from Inner (storage) type to Outer or throws (use `fail()` helper).
- `prepare` maps data from Outer to Inner type.

If Outer is assignable to Inner (e.g. `string -> Json`), `prepare` is optional. If Inner is assignable to Outer (e.g. `string -> string`), `parse` is optional.

There is a built-in `json()` formatter that converts between JSON objects and strings.

### `#BanditStash.use(plugin)`

Return a new stash with `getItem`, `setItem` or `removeItem` behavior modified by the plugin. Plugin is a function called with the original stash. At this point plugin API is unstable, so prefer built-in plugins:

- `safeGet(() => fallback)` — return `fallback` instead of throwing error in `getItem`
- `safeSet()` — ignore errors in `setItem`
- `scope(prefix: string)` — prefix all keys with prefix, `'key' -> 'prefix:key'`

## License

[MIT License](./LICENSE)
