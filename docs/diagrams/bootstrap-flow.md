# Диаграмма: bootstrap-flow

Sequence-диаграмма потока загрузки приложения. Объяснение — [../architecture.md § Bootstrap-поток](../architecture.md).

## Ключевое свойство

UI монтируется **до** окончания асинхронной инициализации. Это даёт пользователю мгновенную обратную связь (splash-экран) даже на медленном backend.

## Диаграмма

```mermaid
sequenceDiagram
    autonumber
    actor Browser
    participant main as main.ts
    participant App as App.vue
    participant Preloader as AppPreloader
    participant Providers as setupProviders
    participant Bootstrap as bootstrap.store
    participant Process as runBootstrapProcess
    participant Router as vue-router

    Browser->>main: загрузка bundle
    main->>main: createApp(App)
    main->>Providers: setupProviders(app)
    Providers->>Providers: pinia + httpClient + errorHandler<br/>+ vuetify + router
    Providers-->>main: { pinia, httpClient, vuetify, router }

    main->>App: app.mount('#app')
    App->>Bootstrap: useBootstrapStore()
    Note over Bootstrap: status = 'idle'<br/>isReady = false
    App->>Preloader: v-else → <AppPreloader/>
    Preloader-->>Browser: SVG-анимация на экране

    main->>Process: await runBootstrapProcess({ router })
    Process->>Bootstrap: start()
    Note over Bootstrap: status = 'initializing'

    Process->>Process: auth.init()
    Note right of Process: чтение токенов из tokenStorage<br/>в state стора auth (sync)

    alt isSessionActive
        Process->>Process: retryOn404(() => user.fetchCurrentUser(),<br/>{ attempts: 3, delay: 500 })
        Note right of Process: тянет профиль через GET /users/me;<br/>retry на 404 покрывает гонку с<br/>UserSignedInEvent на njs-server
    end

    Process->>Router: await isReady()
    Router-->>Process: ✓

    Note right of Process: env уже валидирован (Zod) при импорте<br/>shared/config/env. 401 + refresh — внутри HTTP-клиента.

    alt success
        Process->>Bootstrap: finish()
        Note over Bootstrap: status = 'ready'<br/>isReady = true
        App->>App: v-if переключается на <v-app>
        App-->>Browser: <router-view/> рендерится
    else error
        Process->>Bootstrap: fail(error)
        Note over Bootstrap: status = 'failed'<br/>hasError = true
        Process-->>main: throw
        Note over main: setupErrorHandler ловит<br/>unhandled rejection и<br/>показывает snackbar<br/>через notification-store
    end
```

## Состояния `useBootstrapStore`

```mermaid
stateDiagram-v2
    [*] --> idle: init
    idle --> initializing: start()
    initializing --> ready: finish()
    initializing --> failed: fail(error)
    ready --> idle: reset()
    failed --> idle: reset()
```

Реализация — [src/entities/bootstrap/bootstrap.store.ts](../../src/entities/bootstrap/bootstrap.store.ts).

## Точки расширения

Текущий порядок шагов внутри `runBootstrapProcess`:

1. **Init auth** — `auth.init()`: sync-чтение токенов из `tokenStorage` в state стора. **Реализовано.**
2. **Fetch current user** — `user.fetchCurrentUser()` если `auth.isSessionActive`, обёрнут в `retryOn404` (`@/shared/lib/async`) для гонки с `UserSignedInEvent` бэка. **Реализовано.**
3. **`router.isReady()`** — последний шаг, после него `App.vue` переключается в `<v-app>`. **Реализовано.**

Уже встроено в инфраструктуру (вне bootstrap):

- **Env-валидация** — `shared/config/env.ts` парсит `import.meta.env` через Zod при первом импорте; не нужно вызывать из bootstrap.
- **Session-refresh при 401** — внутри `HttpClient` (single-flight `refreshPromise`), зовётся через `onUnauthorized` коллбэк из `setup-http-client.ts`.

Запланированные расширения ([ROADMAP](../../ROADMAP.md), Фаза 2):

- **Prefetch критичных справочников** — добавлять по необходимости, осторожно: всё, что блокирует splash, тормозит первый рендер.

## Анти-паттерны

| ❌ | Почему плохо |
|---|--------------|
| `app.mount('#app')` после `runBootstrapProcess()` | UI висит без обратной связи пока идёт init |
| `auth.init()` в `setupRouter()` напрямую | Смешивание оркестрации с конфигурацией провайдеров |
| Long-running fetch'и в bootstrap | Splash висит, пользователь думает, что зависло. Лениво подгружай в конкретных страницах |
| Зависимость `entities/bootstrap` от других сущностей | `bootstrap` — FSM, должен быть «глупым». Оркестрация — в `processes/` |

## См. также

- [../architecture.md](../architecture.md) — общая архитектура
- [src/processes/app-bootstrap/bootstrap.process.ts](../../src/processes/app-bootstrap/bootstrap.process.ts) — текущая реализация
- [src/entities/bootstrap/bootstrap.store.ts](../../src/entities/bootstrap/bootstrap.store.ts) — FSM-стор
