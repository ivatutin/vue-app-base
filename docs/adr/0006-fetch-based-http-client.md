# 0006. HTTP-клиент на fetch с DI и refresh-mutex

- **Status:** accepted
- **Date:** 2026-05-22

## Context

Backend `njs-server` (см. [docs/integration-backend.md](../integration-backend.md)) требует Bearer JWT в `Authorization` header для всех protected-endpoints, поддерживает refresh через `POST /auth/refresh` с rotation, возвращает ошибки в едином формате `{ statusCode, error, message, details? }`. Фронту нужен единый клиент, без него каждая API-функция будет дублировать одно и то же.

[ROADMAP.md](../../ROADMAP.md) пункт `[P1] HTTP-клиент` явно требовал зафиксировать выбор fetch vs axios через ADR.

Три ключевых решения:

1. **fetch vs axios.** Axios даёт встроенные interceptors, timeout, cancel-token, upload-progress. Цена — ~14 КБ в бандле и дополнительная зависимость. fetch — нативный (0 КБ), `AbortController` покрывает cancel/timeout, interceptors реализуются в wrapper'е, который нужен в обоих случаях.

2. **Где живёт инстанс.** Клиент в `shared/api/` (FSD: фундамент), но `useAuthStore()` — в `entities/auth/`. Прямой импорт `shared → entities` запрещён правилом одностороннего импорта ([ADR-0001](0001-feature-sliced-design.md)). Варианты:
   - Сделать клиент Pinia-стором в `entities/api/` — нарушает FSD по другому (`entities/api` зависит от `entities/auth`).
   - Provide/inject — `inject()` не работает вне Vue-инстанса (нельзя звать из ad-hoc API-функций).
   - **Singleton-модуль** с initializer + DI через коллбэки — клиент в `shared/api/` без зависимостей вверх, конкретный инстанс собирается в `app/providers/setup-http-client.ts` (provider-pattern уже принят).

3. **Concurrent 401s.** Если несколько запросов одновременно получают 401, нельзя запускать `refresh` несколько раз — это перезатрёт токены и сделает все retry неудачными. Нужен mutex (single-flight): первый 401 запускает refresh, остальные ждут результат.

## Decision

**1. fetch с собственным wrapper-классом `HttpClient`.**

`src/shared/api/http-client.ts`:

```ts
interface HttpClientOptions {
  baseUrl: string
  getAccessToken?: () => string | null
  onUnauthorized?: () => Promise<boolean>  // true → retry, false → give up
}

interface RequestOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined>
  auth?: boolean                            // default true; false для /auth/sign-in, /auth/refresh
}

class HttpClient {
  private refreshPromise: Promise<boolean> | null = null
  // get/post/put/patch/delete<T>(path, body?, options?)
  // → fetch → если 401 и onUnauthorized → mutex refresh → ретрай ровно один раз
  // → если !response.ok → throw HttpError(status, statusText, body.error, body.message, body.details)
  // → если 2xx и application/json → JSON; иначе undefined (для 204)
}
```

`src/shared/api/http-error.ts` — `class HttpError extends Error` с полями `status`, `statusText`, `errorName`, `details`. `message` — `string | string[]` от бэка склеивается в строку для `Error.message`.

**2. Singleton-инстанс с initializer.**

`src/shared/api/instance.ts`:

```ts
let instance: HttpClient | null = null
export function setHttpClient(client: HttpClient): void { instance = client }
export function getHttpClient(): HttpClient {
  if (!instance) throw new Error('HttpClient not initialized. Call setupHttpClient(app) first.')
  return instance
}
```

API-функции импортируют **`getHttpClient()`** из `@/shared/api`, никогда не зовут `new HttpClient(...)` напрямую.

**3. Provider собирает зависимости.**

`src/app/providers/setup-http-client.ts`:

```ts
const auth = useAuthStore()
const client = new HttpClient({
  baseUrl: import.meta.env.VITE_API_URL,
  getAccessToken: () => auth.accessToken,
  onUnauthorized: async () => {
    try { await auth.refresh(); return true }
    catch { auth.logout(); return false }
  },
})
setHttpClient(client)
```

Порядок в `setupProviders`: pinia → **http-client** → vuetify → router. HTTP-клиент собирается после pinia (нужен `useAuthStore()`), до router (чтобы guard и bootstrap могли его использовать).

**4. Single-flight refresh через `refreshPromise`-поле.**

```ts
private retryAfterRefresh(): Promise<boolean> {
  if (!this.options.onUnauthorized) return Promise.resolve(false)
  this.refreshPromise ??= this.options.onUnauthorized()
    .finally(() => { this.refreshPromise = null })
  return this.refreshPromise
}
```

Все concurrent 401s ждут один и тот же `Promise`; после resolve пытаются повторить запрос с новым токеном.

## Consequences

### Положительные

- **0 КБ бандла** — fetch нативный, никаких зависимостей.
- **Чистый FSD** — нет cross-entity-импортов, нет нарушения слоёв.
- **Тестируемость** — `HttpClient` можно инстанцировать в тестах с любыми мок-коллбэками без поднимания Pinia.
- **Контракт ошибок зафиксирован** — `HttpError` имеет поля под формат бэка (`statusCode/error/message/details`), потребитель (snackbar, error-handler) работает с типизированным значением.
- **Refresh-flow безопасен от race** — concurrent 401s не плодят refresh-запросы.

### Отрицательные

- **Singleton-модуль с `let`** — side effect. Если кто-то импортирует `getHttpClient()` до `setHttpClient()` (например, top-level вызов в модуле), получит runtime ошибку. Митигация: правило «API-функции зовут `getHttpClient()` только из тела async-функции», не на топ-уровне.
- **Своя реализация retry/timeout** — fetch не даёт встроенный timeout. На текущем этапе не реализуем (cancel через `signal` достаточно), при необходимости добавим обёртку `withTimeout(ms, signal)`.
- **Один retry** — если refresh успешен, но второй запрос снова 401, клиент не пытается ещё раз. Это сознательно: вероятно, токен мгновенно отозван или истёк лимит, бесконечный цикл бесполезен.

### Что меняется в коде

- Создаются: `src/shared/api/{http-error,http-client,instance,index}.ts`, `src/app/providers/setup-http-client.ts`.
- Модифицируется: `src/app/providers/index.ts` (порядок вызова + `setupHttpClient` в результате).
- Будущее: `entities/user/api/index.ts` и `entities/auth/model/auth.store.ts` начнут звать `getHttpClient()` — фазы 1.5 и 1.6.

## Альтернативы (для истории)

- **axios** — отклонён: +14 КБ, выгода от built-in interceptors не оправдывает на размере проекта; собственный wrapper всё равно нужен (для типизации ошибок, единой обработки 401).
- **ofetch / ky** — современные обёртки над fetch с retry/timeout/hooks. Не выбраны: дополнительная зависимость ради того, что у нас умещается в ~100 строк.
- **TanStack Query без отдельного HTTP-клиента** — кэш+рефетч поверх fetch. Это про слой server-state, не про транспорт; они дополняют друг друга. TanStack Query — отдельный пункт ROADMAP Фаза 2.
- **Pinia-стор как контейнер для инстанса** — отклонён: `useHttpClientStore` пришлось бы импортировать `useAuthStore` (cross-entity).
- **provide/inject** — отклонён: `inject()` работает только внутри setup-функции компонента / composable, не доступен в обычных модульных API-функциях.

## Ссылки

- [integration-backend.md](../integration-backend.md) — контракт `njs-server`, формат ошибок.
- [ADR-0001](0001-feature-sliced-design.md) — FSD-слои.
- [ADR-0005](0005-dto-domain-mapping.md) — DTO ↔ Domain, mapper-pattern (HTTP-клиент возвращает «сырой» ответ, парсинг — снаружи).
