# 0008. TanStack Query для серверного state

- **Status:** accepted
- **Date:** 2026-06-03

## Context

К 10-й API-странице ручная работа с серверным state через Pinia превращается в копипасту:

```ts
// 10 раз в разных сторах
const data = ref<T | null>(null)
const isLoading = ref(false)
const error = ref<Error | null>(null)

async function fetch () {
  isLoading.value = true
  error.value = null
  try {
    data.value = await api.fetchSomething()
  } catch (e) {
    error.value = e as Error
  } finally {
    isLoading.value = false
  }
}
```

Плюс отсутствуют **бесплатные** для serverstate-библиотек фичи:
- **Дедупликация** — если 3 компонента используют `/users/me`, идёт 3 запроса.
- **Кэш между маршрутами** — переход `/users` → `/users/123` → `/users` дёргает список заново.
- **Stale-while-revalidate** — нужно явно решать «когда тянуть свежее».
- **Background refetch** на focus / reconnect.
- **Инвалидация по группам ключей** после mutation.
- **Optimistic updates** с rollback.
- **Pagination / infinite scroll** state.

[ROADMAP.md](../../ROADMAP.md) уже содержал пункт `[P2] TanStack Query для серверного state` со статусом `proposed`. Триггер «3 места одного endpoint'а» близок (`/users/me` потребуется в Header, на Dashboard, в Profile-странице — это уже 3).

Альтернативы, которые рассматривали:

1. **VueUse `useAsyncState`** — простой composable со state. Нет кэша, дедупликации, инвалидации. Хорош для разового запроса, не для системного слоя.

2. **`useAsyncStatus`** (собственный composable, [ROADMAP](../../ROADMAP.md) Фаза 2) — то же что VueUse, просто свой. Не решает кэш / инвалидацию.

3. **Pinia + ручная логика кэша** — реализуемо, но к 10-му стору это de-facto собственный TanStack Query, написанный некачественно.

4. **SWR-vue** — порт SWR из React. Менее зрелый чем TanStack Query (на 2026 — TQ v5 stable, SWR-vue v1.x, меньше contributors). Похожий API.

5. **unplugin-vue-router `data-loaders`** — уже в `optimizeDeps` нашего `vite.config.mts`. Но это **другой паттерн**: per-route loader, выполняется до навигации. Хорош для prefetch критичных данных. **Не заменяет** component-level queries (header-аватарка, dropdown в форме). Можно использовать в дополнение, не вместо.

6. **TanStack Query v5** — индустриальный стандарт 2024-2026 для React/Vue. Зрелый, активно поддерживается, экосистема (devtools, persistence, hydration). 8 КБ gzipped в bundle.

## Decision

**TanStack Query как primary тулл для серверного state**, параллельно Pinia для клиентского state. Разделение по типу данных, не по сущности.

### Разделение ответственности

| State | Где |
|---|---|
| Auth tokens (accessToken, refreshToken) | Pinia (`useAuthStore`) — синхронный, локальный |
| RBAC (roles, permissions, hasPermission) | Pinia (`useUserStore`) — guard'ы и `<Can>` требуют синхронности |
| Notification queue | Pinia (`useNotificationStore`) — чисто клиентский UI-state |
| Bootstrap FSM | Pinia (`useBootstrapStore`) — конечный автомат |
| Theme mode | Module singleton (`useTheme`) — клиентский |
| Профиль из `/users/me` (полные поля) | TanStack Query (`useCurrentUserQuery`) — кэш + refresh |
| Списки сущностей (users, roles, ...) | TanStack Query — пагинация + invalidate после CRUD |
| Detail-страницы | TanStack Query — кэш между маршрутами |
| Dashboard-метрики | TanStack Query — background refresh |
| Lookup-справочники (страны, валюты) | TanStack Query с большим `staleTime` (часы) |

**Bridge для профиля** (RBAC требует синхронности, TQ — асинхронный):

```ts
// В bootstrap или auth-flow — watch TQ data → положить в user.store
watch(userQueryData, dto => {
  if (dto) userStore.setUser(dto)
})
```

Pinia `useUserStore` остаётся как **синхронный источник для RBAC**. TQ — как **фоновый refresh + cache** того же ресурса. Через год при необходимости можно унифицировать.

### Конвенции

**QueryKey — иерархический массив** (не строка):

```ts
['users', 'me']                          // одиночный ресурс
['users', 'list', { page: 1 }]          // коллекция с параметрами
['users', userId]                        // конкретный по id
['posts', userId, 'comments']            // вложенные
```

Иерархия даёт групповую инвалидацию: `invalidateQueries({ queryKey: ['users'] })` сбросит **все** запросы про пользователей.

**Размещение composables**: `src/entities/<slice>/api/use-<name>-query.ts` или `use-<name>-mutation.ts`. Экспортируем через barrel слайса — `import { useCurrentUserQuery } from '@/entities/user'`.

> **Поправка от 2026-07-21.** Изначально здесь было «через barrel `entities/<slice>` не экспортируем (это implementation detail сегмента api)». Формулировка ошибочна и создавала тупик: [ADR-0001](0001-feature-sliced-design.md) и [CONTRIBUTING](../../CONTRIBUTING.md) требуют отдавать наружу **только** через `index.ts` слайса, а это правило запрещало туда что-либо класть — пересечение пусто, легального импорта не существовало. На практике `useCurrentUserQuery` документировался примером с запрещённым deep-import'ом.
>
> Query-composable, который вызывают страницы и виджеты, — это и есть публичный API слайса. Деталь реализации — то, что под ним: `getCurrentUser`, DTO-схема и маппер; они наружу не идут.
>
> Следствие: composable **не должен** импортировать соседние слайсы ради условий запуска. Условие передаётся параметром (`enabled`), оркестрация — на вызывающей стороне.

**Дефолты** ([setup-query-client.ts](../../src/app/providers/setup-query-client.ts)):
- `staleTime: 30_000` — 30 секунд (B2B-инструмент, не лента соцсети, частые refresh не нужны).
- `refetchOnWindowFocus: false` — не отвлекать пользователя.
- `retry: 1` — одна повторная попытка на сетевую ошибку (HTTP-клиент уже делает refresh на 401 сам).

Конкретные queries могут переопределить per-call.

**Mutations — invalidate'им через `onSuccess`**:

```ts
const { mutate } = useMutation({
  mutationFn: createUser,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
})
```

**Auth-redirect на 401** — НЕ дублируем. HttpClient уже делает refresh-mutex через `onUnauthorized` ([ADR-0006](0006-fetch-based-http-client.md)). TQ просто получает уже-refreshed ответ или `HttpError` при провале refresh.

### Что НЕ делаем сразу

- **Не мигрируем существующий `useUserStore`** одним проходом. Pilot — `useCurrentUserQuery` параллельно. Bridge — по триггеру.
- **Не пишем свой `useAsyncStatus`** ([ROADMAP](../../ROADMAP.md) пункт). TQ закрывает эту нишу полностью.
- **DevTools (`@tanstack/vue-query-devtools`)** установлен как devDep, но `<VueQueryDevtools />` не подключён в App.vue по умолчанию. Включать опционально через flag.
- **SSR / hydration** — не актуально, SPA. При переезде на Nuxt — `hydrate`/`dehydrate` тогда же.

## Consequences

### Положительные

- **−5-10 строк boilerplate на каждый endpoint** vs ручной Pinia + ref + isLoading + error.
- **Дедупликация автоматически** — N компонентов с одинаковым `queryKey` = один сетевой запрос.
- **Кэш между маршрутами** — переход и возврат на ту же страницу не дёргает API повторно (если `staleTime` не истёк).
- **Background refresh + optimistic updates** — UX-фичи доступны через флаги/опции, не пишем сами.
- **Индустриальный стандарт** — нанимать легче (Vue/React-разработчики знакомы).
- **DevTools** для дебага кэша.

### Отрицательные

- **+8 КБ gzipped** в bundle (TanStack Query core).
- **Mental model** — queryKey, staleTime, invalidation, optimistic updates. Нужно один раз разобраться, потом окупается.
- **Двойственность в переходный период** — `useUserStore` (RBAC) + `useCurrentUserQuery` (refresh). Конвенция bridge должна быть зафиксирована (см. § Разделение ответственности).
- **Дополнительная зависимость** — мейнтейнерский риск, хотя TanStack — крупная команда (Tanner Linsley + active community).

### Что меняется в коде

- **Phase 1 — Infrastructure (done в pilot-коммите):**
  - `npm install @tanstack/vue-query @tanstack/vue-query-devtools`.
  - [src/app/providers/setup-query-client.ts](../../src/app/providers/setup-query-client.ts) — QueryClient + VueQueryPlugin.
  - Регистрация в [src/app/providers/index.ts](../../src/app/providers/index.ts) (после theme, до router).

- **Phase 2 — Pilot (done в pilot-коммите):**
  - [src/entities/user/api/use-current-user-query.ts](../../src/entities/user/api/use-current-user-query.ts) — `useCurrentUserQuery()` (queryKey `['users', 'me']`, enabled при активной сессии).

- **Phase 3 — Постепенная миграция (по триггерам):**
  - Любая новая list-страница → `useQuery` сразу, не Pinia.
  - Любая новая mutation → `useMutation` + invalidate.
  - При появлении 2-й-3-й страницы профиля — bridge `useUserStore` ↔ `useCurrentUserQuery`.

## Альтернативы (для истории)

### Только Pinia + ручной кэш

Не выбран. К 10-му стору превращается в half-baked TQ. Если уже писать кэш с инвалидацией — взять готовое.

### VueUse `useAsyncState` / собственный `useAsyncStatus`

Не выбран как primary. Решает только loading/error state, не решает кэш/дедупликацию/refresh. Подходит для разового запроса в админ-инструменте, но не как системный слой.

### SWR-vue

Не выбран. Менее зрелый, меньше features, меньше адаптация. TQ — стандарт.

### data-loaders из unplugin-vue-router

Не выбран как primary. Per-route модель не покрывает component-level queries (header-аватарка, dropdown в форме). Может использоваться **дополнительно** к TQ — для prefetch критичных данных перед навигацией. Решение по data-loaders откладывается до появления реальной проблемы.

## Связанные ADR / документы

- [ADR-0002](0002-pinia-setup-stores.md) — Pinia setup-stores. TQ дополняет, не заменяет.
- [ADR-0006](0006-fetch-based-http-client.md) — HTTP-клиент. TQ использует `getHttpClient()`, не дублирует refresh/auth.
- [ROADMAP.md](../../ROADMAP.md) — пункт `[P2] TanStack Query для серверного state` обновлён до `partial done` (infrastructure + pilot composable).
