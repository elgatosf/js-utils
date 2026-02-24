<!--

## {version}

⚠️ Breaking change
✨ New
🐞 Fix
♻️ Refactor / Enhance / Update
⬆️ Upgrading

-->

# Change Log

## 0.4.2

### ✨ New

- Add `getProcesses` function to retrieve a list of running processes.

## 0.4.1

### ✨ New

- Add string formatting via `format`.

## 0.4.0

### ✨ New

- Add support for monitoring new and removed events to align more closely with Node.js implementation.
    - Emits `newListener` when listeners are added.
    - Emits `removeListener` when listeners are removed.
- Add support for changing the default language within an `I18nProvider`.

## 0.3.1

### 🐞 Fix

- Fix default timeout of RPC requests.

## 0.3.0

### ✨ New

- Add `DisposableStack` to manage multiple disposables.

### ♻️ Refactor

- Update Node.js functionality to be optional.
- `FileTarget` is now importable directly via `@elgato/utils/logging/file-target.js`.
- `FileTarget` removed from `@elgato/utils/logging`.

## 0.2.1

### 🐞 Fix

- Fix missing type export for `RpcServerClient`.

## 0.2.0

### ♻️ Refactor

- Update `RpcClient` to accept options.
- Replace `unidentifiedResponse` event in `RpcClient` with `options.error`.
- Replace `RpcGateway` with `createRpcServerClient` to streamline interface.
- Rename `RpcProxy` to `RpcSender`.
- Rename `RpcServer.add` to `RpcServer.addMethod`.
- Remove requirement of a result from `RpcSender`.

### 🐞 Fix

- Remove `node:stream` import within `RpcClient`.

## 0.1.0

### ✨ New

- Add `deferredDisposable` for creating managed resources.
- Add type-safe `EventEmitter` class for browser and node.
- Add `JsonObject`, `JsonPrimitive`, and `JsonValue` to support JSON types.
- Add `Enumerable` class to support lazy evaluation (iterator helper polyfill).
- Add `Lazy<T>` class for lazy (singleton) value evaluation.
- Add `get` and `set` helper functions for objects.
- Add `parseBoolean` and `parseNumber` for (opinionated) parsing values.
- Add `withResolvers` function to polyfill `Promises.withResolvers()`.
- Add `debounce` function.
