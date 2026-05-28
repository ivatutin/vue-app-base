# ROADMAP

Живой документ. Приоритезированный план развития архитектуры и инфраструктуры. Делится на 4 фазы по убыванию срочности. Известные баги — отдельно в [KNOWN-ISSUES.md](KNOWN-ISSUES.md).

Статусы: `proposed` (предложение, ждёт обсуждения) · `planned` (принято, ждёт реализации) · `in-progress` · `done`.

---

## Фаза 0 — Стабилизация `done` (2026-05-22)

Закрыты ломающие баги, baseline `npm run type-check` green. Цепочка из 8 коммитов от `f4a3421` до `e0b5bb6`. Детали по каждому пункту — в git-логе и в свёрнутом ниже журнале.

### [P0] Привести схему `User` и стор к единой конвенции `done`
Закрыто разделением DTO ↔ Domain ([ADR-0005](docs/adr/0005-dto-domain-mapping.md)): `userDtoSchema` (snake_case) + `userSchema` (camelCase) + `toUser` mapper. `isAuthorized` теперь работает, бесконечный редирект на login снят.

### [P0] Создать `shared/model/permission/` и починить сломанные импорты `done`
Vocabulary прав вынесено в `shared/model/permission/` ([ADR-0004](docs/adr/0004-rbac-vocabulary-in-shared.md)). Импорты `PermissionCode` в `can.ts`, `sidebar-items.ts` и `user.schema.ts` переведены на `@/shared/model/permission`.

### [P0] Разделить DTO ↔ Domain для `entities/user/` `done`
Реализован трёхфайловый паттерн `api/user.dto.ts` + `schema/user.schema.ts` + `api/user.mapper.ts`. `api/index.ts` парсит DTO и гонит через mapper, `UserDto` за пределы `api/`-сегмента не выходит.

### [P0] Доделать `entities/auth/auth.store.ts` `done`
Возвращён `return` из setup, реализован `init()` (явное чтение токенов из storage), `login`/`refresh` как чёткие заглушки `throw Error('not implemented yet')` с TODO на HTTP-клиент (Фаза 1), `logout` чистит state + storage. Опечатка `emaiil_or_phone` → `emailOrPhone`, `isLoaded` → `isLoading`. `entities/auth/index.ts` заполнен.

### [P0] Починить auth-guard `done`
`useUserStore()` перенесён внутрь `router.beforeEach`, обёрнут в `storeToRefs` — реактивность восстановлена, ref'ы обновляются по мере наполнения стора bootstrap'ом.

### [P0] Заменить `sleep(3000)` в bootstrap на реальный pipeline `done`
Pipeline: `auth.init()` → если `auth.isSessionActive` то `user.fetchCurrentUser()` → `router.isReady()`. Env-валидация остаётся на Фазу 1.

### [P1] Починить типизацию в `shared/lib/utils` `done`
`plural()`: сигнатура `readonly string[]` + страховка индекса. `formatTimeInterval`: исправлена копипаста `units.y[0]` во всех short-ветках, опечатка `shortFromat` → `shortFormat`. `npm run type-check` стал green.

### [P1] Удалить отладочный мусор `done`
Удалены `console.log` в `setup-router.ts`/`default.vue`/`user/api/index.ts`; убраны несуществующий `prepend-gap` и копипастный `theme.toggle()` в `AppHeader.vue`; убран дубль `import { shallowRef }` в `AppFooter.vue`; `stroke="green"` → `currentColor` в `AppPreloader.vue`; удалён хак `route.meta.title.value` в `DashboardPage.vue` + расширение `RouteMeta` в `src/router-meta.d.ts`; переименован `pages/systesm/` → `pages/system/` с регенерацией `typed-router.d.ts`. Оставшиеся P2-мелочи (`pages/index.vue`, `vite.config.mts:108`, naming-convention, `config.json`↔`.env` дубль) — не блокирующие, остаются в [KNOWN-ISSUES.md](KNOWN-ISSUES.md).

---

## Фаза 1 — Инфраструктура и интеграция с backend `done` (2026-05-25)

Закладка фундамента + первое реальное подключение к `njs-server`. Порядок согласован с тем, что мы знаем о контракте (см. [docs/integration-backend.md](docs/integration-backend.md)). Атомарные коммиты от `4ae1e3a` до `f1a245e`.

### [P1] Vite proxy для dev `done`
В `vite.config.mts` добавлен `server.proxy '/api' → http://localhost:3001`. `.env` приведён к `VITE_API_URL=/api/v1`, `VITE_WS_HOST` удалён (WS на бэке не реализован). Документация в `docs/reference/env.md`.

### [P1] HTTP-клиент `shared/api/http-client.ts` `done`
Реализовано: `class HttpClient` + `HttpError` + singleton-инстанс через `shared/api/instance.ts`, провайдер `setup-http-client.ts` с DI auth-interceptor (`getAccessToken` + `onUnauthorized → auth.refresh()`), single-flight refresh-mutex. Архитектурное решение в [ADR-0006](docs/adr/0006-fetch-based-http-client.md).

### [P1] User-схема под реальный `UserResponseDto` `done`
`userDtoSchema` и Domain `userSchema` приведены к контракту бэка: camelCase, раздельные `firstName/lastName`, `emailVerified/phoneVerified`, `status` enum (`pending_verification | active | suspended | deleted`), `createdAt/updatedAt`. `userStore.isAuthorized` = `status === 'active'`, `fullName` — computed с fallback на email/phone. Мок временно отдаёт корректный camelCase-payload до подключения `/users/me`.

### [P1] auth.store: real login/refresh/logout `done`
Реализовано через `entities/auth/api/` (signIn, refreshTokens, signOut) поверх HTTP-клиента. `login(email, password)` парсит `tokenPairDtoSchema`, кладёт токены в `tokenStorage`. `refresh()` бросает при отсутствии refresh, делает rotation. `logout()` пытается sign-out на бэке, локальную очистку делает всегда (даже при 401 / сетевой ошибке).

### [P1] Подключить `getCurrentUser` к `/users/me` `done`
`entities/user/api/getCurrentUser` теперь делает реальный `GET /users/me` через HTTP-клиент, парсит через `userDtoSchema`, гонит через `toUser`. `fetchCurrentUser` пробрасывает ошибку наверх (state в `null`), bootstrap-процесс оборачивает в `retryOn404` из `shared/lib/async` (3 попытки × 500ms — гонка с async-созданием local user после первого sign-in). `entities/user/api/logoutRequest` удалён — sign-out живёт в `entities/auth/api/`.

### [P1] Валидация env через Zod `done`
`shared/config/env.ts` парсит `import.meta.env` через `envSchema` на момент первого импорта; при невалидном env бросает ошибку со списком issues. Экспортирован singleton `env` (типизирован Zod-inference). `setup-http-client.ts` использует `env.VITE_API_URL`; прямой доступ к `import.meta.env.VITE_*` теперь только внутри `shared/config/env.ts`.

### [P1] AuthLayout `done`
Создан `src/app/layouts/auth.vue` (центрированная карточка, без `<v-app-bar>`/sidebar/footer). LoginPage переписан под реальный flow (`auth.login` → `user.fetchCurrentUser` → redirect на `/dashboard`), показывает loading и ошибки `HttpError`. LogoutPage зовёт `auth.logout` + `user.reset` в `onMounted`.

### [P1] Глобальная обработка ошибок + Snackbar `done`
Создан `entities/notification` (setup-store с очередью + push / dismiss / clear), хост-widget `widgets/app-notifications` (рендерит `<v-snackbar>` стек, кнопка close, авто-dismiss по timeout) подключён в оба layout'а (default, auth). Provider `setup-error-handler.ts` ловит `app.config.errorHandler`, `unhandledrejection` и `window.error`, конвертирует через `humanize(err)` (HttpError → message, Error → message, иначе generic) и кладёт в notification-store.

### [P1] RBAC в guard + roles→permissions mapping `done`
`shared/model/permission/role-permissions.ts` — статическая таблица `ROLE_PERMISSIONS` (admin/manager/user) + `rolesToPermissions(roles)`. `useUserStore` снова экспортирует `permissions` (computed) и `hasPermission(p)`. `can()` восстановлен. Router-guard расширен: после auth-check проверяет `meta.permissions`, при нехватке прав — редирект на `/system/forbidden`.

---

## Фаза 2 — DX и расширяемость

Когда фундамент стоит — закладываем масштабируемость и культуру.

> Пункт «DTO ↔ Domain model» перенесён в Фазу 0 и зафиксирован в [docs/adr/0005-dto-domain-mapping.md](docs/adr/0005-dto-domain-mapping.md). Паттерн обязателен для всех сущностей с API, не только для новых после реального backend.

> **Миграция с Vuetify** — стратегия и целевой стек зафиксированы в [docs/adr/0007-ui-stack-migration-from-vuetify.md](docs/adr/0007-ui-stack-migration-from-vuetify.md). ADR поднимает в приоритет пункты `[P2] Vuetify-обёртка`, `[P2] Vitest`, и переносит из Фазы 3 пункты **Storybook** и **Design tokens** (становятся частью Фазы 2 как Фаза 2.5 фундамента для миграции).

### [P2] Route data-loaders `proposed`
**Зачем:** `unplugin-vue-router/data-loaders` уже в `optimizeDeps` (см. `vite.config.mts`), но не используется. Это убирает 80% «store + fetch + isLoading» boilerplate'а на list-страницах.
**Что:** перевести list-страницы на `defineBasicLoader`/`defineLoader`.
**Trade-off:** API ещё стабилизируется. Не подходит для глобального state.
**Триггер:** появление 3+ list-страниц.

### [P2] TanStack Query для серверного state `proposed`
**Зачем:** дедупликация, кэш, фоновое обновление, инвалидация, optimistic updates. Окупается к 10-й API-странице.
**Что:** `@tanstack/vue-query`, оставить Pinia только для клиентского state.
**Trade-off:** +библиотека, +mental model.
**Триггер:** в 3 местах один и тот же endpoint, или запрос «обновлять каждые N секунд».

### [P2] Декларативная RBAC `proposed`
**Зачем:** `v-if="can('user.delete')"` на 50 кнопках — нечитаемо и не грепается.
**Что:** компонент `<Can permission="...">` или директива `v-can`.
**Триггер:** 5+ permission-зависимых UI-элементов.

### [P2] `usePageMeta` composable `proposed`
**Зачем:** текущий хак с `route.meta.title.value = ...` (см. `DashboardPage.vue`) опасен и плохо реактивен.
**Что:** composable + стор `pageMetaStore` (title, breadcrumbs, actions). Layout рендерит из него.
**Триггер:** 3-я страница с динамическим title.

### [P2] Form architecture `proposed`
**Зачем:** будут десятки форм. Без общего паттерна — копипаста и боль валидации.
**Что:** VeeValidate + Zod-resolver (рекомендую) либо собственный `useForm`.
**Триггер:** второй CRUD-экран.

### [P2] Vuetify-обёртка в `shared/ui/base/` `planned`
**Зачем:** прямое использование `<v-btn>` в widgets/pages = vendor lock-in.
**Что:** Фаза 2.6 миграции с Vuetify по [ADR-0007](docs/adr/0007-ui-stack-migration-from-vuetify.md). Тонкие обёртки с доменным API (`<Button variant="primary" loading>`) — пока поверх Vuetify, потом реализация подменяется на shadcn-vue + Tailwind (Фаза 2.7).
**Триггер:** немедленно после Фазы 2.5 (Design tokens + Storybook + Vitest).

### [P2] `processes/` для cross-entity сценариев `partial done`
Создан `processes/auth-flow` с `loginFlow(email, password)` (auth.login → retryOn404 user.fetchCurrentUser + compensating rollback) и `logoutFlow()` (гарантированная очистка auth + user через try/finally). Потребители: LoginPage, LogoutPage и `setup-http-client.ts` `onUnauthorized` (последний раньше зовёл `auth.logout()`, оставляя осиротевший user-state — это был скрытый баг). Покрыто 4 unit-тестами через `vi.spyOn` на сторы. Session-refresh-flow отдельным процессом не нужен — refresh-mutex уже внутри HttpClient ([ADR-0006](docs/adr/0006-fetch-based-http-client.md)).

### [P2] i18n (vue-i18n) `proposed`
**Зачем:** UI уже на русском, тексты вшиты в шаблоны. Перевести через год — невозможно.
**Что:** vue-i18n + словари `shared/i18n/locales/{ru,en}.json` + setup-провайдер.
**Триггер:** до того, как накопится 50+ страниц.

### [P2] ESLint-boundaries для FSD `proposed`
**Зачем:** без автомата человеческая дисциплина проседает на 3-й месяц. FSD ломается тихо.
**Что:** `eslint-plugin-boundaries` или `@feature-sliced/eslint-config`. Запрет нарушения слоёв + запрет импорта в обход barrel.
**Триггер:** в команде появился 3-й разработчик.

### [P2] Husky + lint-staged + commitlint `done`
Husky 9 + lint-staged 17 + @commitlint/{cli,config-conventional} 21. Pre-commit запускает `eslint --fix` только на staged `*.{ts,vue,js,mjs,cjs}`. Commit-msg валидирует conventional commits с ослаблениями для русскоязычных сообщений (`subject-case: 0`, `header-max-length: 120`, `body/footer-max-line-length: 200`). Конфиг — [commitlint.config.cjs](commitlint.config.cjs).

### [P2] Vitest для shared/lib и сторов `done`
Vitest 4 + @vue/test-utils 2 + happy-dom 20. Конфиг — отдельный [vitest.config.ts](vitest.config.ts) (без Vue/Vuetify-плагинов для скорости, но с `unplugin-auto-import` для совместимости с production-кодом). 36 тестов покрывают три паттерна: чистые функции (`plural`, `formatTimeInterval`, `normalizePhone`, `rolesToPermissions`), async с fake-timers (`retry`/`retryOn404`), Pinia setup-store (`notification.store`). Прогон — `npm test`, watch — `npm run test:watch`. Документация — [docs/reference/commands.md](docs/reference/commands.md) § Тестирование. Это Фаза 2.5 фундамента миграции по [ADR-0007](docs/adr/0007-ui-stack-migration-from-vuetify.md) — теперь обёртки `shared/ui/base/` пишутся **с тестами**, замена реализации делается безопасно.

### [P2] `useAsyncStatus` или Query вместо разных loading-флагов `proposed`
**Зачем:** сейчас `bootstrap` — FSM, `auth` — `isLoaded`, `user` — нет вообще. К 20-му стору — зоопарк.
**Что:** общий composable `useAsyncStatus()` ИЛИ переход на TanStack Query (взаимоисключающие).
**Триггер:** третий стор с асинхронной загрузкой.

---

## Фаза 3 — Observability и масштабирование

Когда продукт пошёл в прод и появились пользователи.

### [P3] Sentry / observability `proposed`
**Что:** `@sentry/vue` + source maps в CI. Замена `console.error` на структурированный логгер.

### [P3] Storybook для `shared/ui/base/` `proposed`
**Что:** живой reference для компонентов с props/slots/состояниями.
**Триггер:** 10+ компонентов в `shared/ui/`.

### [P3] CI (lint + type-check + test + build) `proposed`
**Что:** GitHub Actions или эквивалент. Превью PR — опционально.

### [P3] Design tokens `proposed`
**Зачем:** Vuetify-theme — vendor-specific. Дизайн-токены отделяют бренд от UI-фреймворка.
**Что:** `shared/assets/tokens/` (SCSS-переменные или CSS-vars), Vuetify-тема собирается из них.

### [P3] Code-splitting аудит `proposed`
**Что:** проверить чанки Vite. Тяжёлые widgets/features через `defineAsyncComponent`.

### [P3] Типизированный event-bus для cross-cutting событий `proposed`
**Зачем:** `auth:logged-in`, `session:expired` — события, на которые нужно реагировать из разных мест.
**Что:** `mitt` + типизированный контракт. Только cross-cutting; обычная коммуникация — через provide/inject или сторы.
**Trade-off:** легко превращается в свалку — нужна дисциплина.

### [P3] PWA / Service Worker `proposed`
**Что:** `vite-plugin-pwa`. Полезно для частичного offline и push.

### [P3] Вынос `shared/` в npm-пакет `proposed`
**Зачем:** если будет 2+ SPA — переиспользовать. FSD уже готова к этому структурно.
**Триггер:** появление второго SPA-проекта.

---

## Как добавлять пункты

1. Опиши в формате выше (Зачем / Что / Trade-off / Триггер).
2. Поставь статус `proposed`.
3. Помести в подходящую фазу.
4. Поднимай в обсуждение командой.
5. Принимаешь — создаёшь ADR в [docs/adr/](docs/adr/), меняешь статус на `planned`.
