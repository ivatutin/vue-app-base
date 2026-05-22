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

## Фаза 1 — Инфраструктура

Закладка фундамента, без которого нельзя растить продакшен-проект.

### [P1] HTTP-клиент `shared/api/http-client.ts` `proposed`
**Зачем:** сейчас `getCurrentUser` — мок. На реальном backend без единого клиента не обойтись: auth-interceptor, обработка 401 + refresh, timeout/retry, типизированный парсинг ответа.
**Что:** fetch-wrapper или axios + interceptors + класс ошибок `HttpError`.
**Trade-off:** axios = ~14KB, fetch = 0KB; выбор фиксируется ADR.
**Триггер:** первый реальный API-вызов к backend.

### [P1] Валидация env через Zod `proposed`
**Зачем:** `import.meta.env.VITE_*` сейчас типизирован, но не валидируется. Отсутствующая переменная → ошибка глубоко в рантайме.
**Что:** `shared/config/env.ts` с `envSchema.parse(import.meta.env)`. Падать на старте с понятной ошибкой.
**Триггер:** второй env-параметр.

### [P1] Глобальная обработка ошибок `proposed`
**Зачем:** нет `app.config.errorHandler`, нет `window.unhandledrejection`, нет точки подключения Sentry.
**Что:** `shared/lib/error/` + `app/providers/setup-error-handler.ts`.
**Триггер:** до выхода на staging.

### [P1] Snackbar / notification store `proposed`
**Зачем:** без глобального уведомлятора каждый разработчик слепит свой `v-snackbar` в каждой странице.
**Что:** `entities/notification` или `shared/ui/feedback/notify` + `widgets/app-notifications` (хост в layout).
**Триггер:** второе место в коде, где нужно «показать тост».

### [P1] AuthLayout `proposed`
**Зачем:** `LoginPage` сейчас рендерится внутри default-layout с сайдбаром и хедером.
**Что:** `src/app/layouts/auth.vue` (центрированная карточка, без навигации) + `definePage({ meta: { layout: 'auth' } })` в auth-страницах.
**Триггер:** редизайн логина.

### [P1] RBAC в guard `proposed`
**Зачем:** сейчас `can()` фильтрует только sidebar. По прямой ссылке можно попасть на запрещённый маршрут.
**Что:** `meta.permissions: PermissionCode[]` + проверка в `router.beforeEach`. Редирект на `/system/forbidden`.
**Триггер:** появление второго permission-зависимого маршрута.

---

## Фаза 2 — DX и расширяемость

Когда фундамент стоит — закладываем масштабируемость и культуру.

> Пункт «DTO ↔ Domain model» перенесён в Фазу 0 и зафиксирован в [docs/adr/0005-dto-domain-mapping.md](docs/adr/0005-dto-domain-mapping.md). Паттерн обязателен для всех сущностей с API, не только для новых после реального backend.

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

### [P2] Vuetify-обёртка в `shared/ui/base/` `proposed`
**Зачем:** прямое использование `<v-btn>` в widgets/pages = vendor lock-in. Vuetify 4 → переписывать сотни мест.
**Что:** тонкие обёртки с доменным API (`<Button variant="primary" loading>`).
**Триггер:** 50+ кнопок в проекте.

### [P2] `processes/` для cross-entity сценариев `proposed`
**Зачем:** auth-flow (login → fetch user → fetch permissions → navigate) не помещается ни в один стор. Сторы, зовущие друг друга, — антипаттерн.
**Что:** `processes/auth-flow`, `processes/logout-flow`, `processes/session-refresh`.
**Триггер:** второй cross-entity сценарий.

### [P2] i18n (vue-i18n) `proposed`
**Зачем:** UI уже на русском, тексты вшиты в шаблоны. Перевести через год — невозможно.
**Что:** vue-i18n + словари `shared/i18n/locales/{ru,en}.json` + setup-провайдер.
**Триггер:** до того, как накопится 50+ страниц.

### [P2] ESLint-boundaries для FSD `proposed`
**Зачем:** без автомата человеческая дисциплина проседает на 3-й месяц. FSD ломается тихо.
**Что:** `eslint-plugin-boundaries` или `@feature-sliced/eslint-config`. Запрет нарушения слоёв + запрет импорта в обход barrel.
**Триггер:** в команде появился 3-й разработчик.

### [P2] Husky + lint-staged + commitlint `proposed`
**Зачем:** pre-commit lint + Conventional Commits.
**Что:** husky, lint-staged, @commitlint/config-conventional.
**Триггер:** появление PR-review-флоу.

### [P2] Vitest для shared/lib и сторов `proposed`
**Зачем:** в проекте 0 тестов. Утилиты типа `plural`, `normalizePhone`, `formatBytes` — идеальные кандидаты unit-тестов.
**Что:** vitest + @vue/test-utils.
**Триггер:** второй критический баг в логике.

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
