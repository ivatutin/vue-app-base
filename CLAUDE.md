# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Язык общения

**Всё общение с пользователем — только на русском языке.** Ответы, комментарии в обсуждениях, сообщения коммитов, описания PR, текст в чате — на русском. Код, идентификаторы, имена файлов, строки в исходниках — остаются на английском (если в проекте уже не принято иное).

## Команды

```bash
npm run dev          # Dev-сервер Vite на http://localhost:3000
npm run build        # Параллельно: type-check (vue-tsc --build --force) + vite build (через npm-run-all2)
npm run build-only   # Только сборка, без type-check
npm run type-check   # Только vue-tsc
npm run lint         # eslint . --fix (наследуется от eslint-config-vuetify — fork Vue/TS-конвенций, не привязан к Vuetify runtime)
npm run preview      # Предпросмотр production-сборки
```

Тестовый раннер не настроен. Команды для запуска одного теста нет.

## Архитектура

Проект построен по **Feature-Sliced Design (FSD)**. Слои внутри `src/` (сверху вниз — верхние слои могут импортировать из нижних, но не наоборот):

```
app/        composition root, провайдеры, лэйауты, App.vue, main.ts
processes/  длительные многошаговые сценарии (app-bootstrap, auth-flow)
pages/      маршрутные страницы — file-based routing
widgets/    самостоятельные блоки лэйаута (app-header, app-sidebar, ...)
features/   пользовательские сценарии (зарезервирован, пока пуст / закомментирован в vite.config.mts)
entities/   бизнес-сущности (user, auth, bootstrap, notification) — здесь же Pinia-сторы
shared/     переиспользуемая инфраструктура: lib/utils, ui/base, model (Zod-схемы)
```

Внутри каждого слайса используется **сегментная конвенция** `ui / model / api / lib / schema`. Каждый слайс отдаёт **публичный API через `index.ts`** (barrel) — импортируй из `@/widgets/app-sidebar`, а не из внутренних файлов. Алиас `@/` указывает на `src/`.

### Процесс bootstrap — неочевидный момент

[src/app/main.ts](src/app/main.ts) намеренно монтирует приложение **до** запуска асинхронного bootstrap, чтобы splash-экран отрисовался сразу:

1. `createApp(App)` → `setupProviders(app)` регистрирует Pinia, HTTP-клиент, error-handler, ThemeProvider, Router.
2. `app.mount('#app')` — на этом этапе [App.vue](src/app/App.vue) показывает `<AppPreloader/>`, потому что стор `bootstrap` всё ещё в состоянии `idle`.
3. `runBootstrapProcess({ router })` ([processes/app-bootstrap/bootstrap.process.ts](src/processes/app-bootstrap/bootstrap.process.ts)) переключает FSM bootstrap `idle → initializing → ready | failed`, ждёт `router.isReady()`, и только после этого рендерится `<router-view/>` (через [layouts/default.vue](src/app/layouts/default.vue) или [auth.vue](src/app/layouts/auth.vue)).

Стор bootstrap — это **конечный автомат** ([entities/bootstrap/bootstrap.store.ts](src/entities/bootstrap/bootstrap.store.ts) со status + error + actions `start/finish/fail/reset`. Держи `entities/bootstrap` (состояние) и `processes/app-bootstrap` (оркестрация) раздельно.

### Маршрутизация — file-based с FSD-aware резолвером пути

Маршруты генерирует `unplugin-vue-router`. Кастомный резолвер в [vite.config.mts](vite.config.mts) маппит `src/pages/<group>/ui/<Name>Page.vue` → URL `/<group>`, чтобы страница могла быть FSD-слайсом со своими сегментами `ui/`, `model/`, ..., а не плоским файлом. Обычные файлы вроде `src/pages/ui-kit/buttons.vue` обрабатываются стандартной логикой.

- Внутри страницы meta задаётся через макрос `definePage({ meta: { ... } })` (авто-импорт), а не правкой записей маршрутов.
- Auth-guard ([app/providers/setup-router.ts](src/app/providers/setup-router.ts)) работает как **whitelist по `meta.noAuth`** — любой маршрут без `noAuth: true` требует `useUserStore().isAuthorized`.
- Сгенерированные типы маршрутов лежат в `src/typed-router.d.ts` (закоммичено, регенерируется при `dev`/`build` — руками не редактируй). `RouteMeta` расширен в `src/router-meta.d.ts` (`title?`, `noAuth?`, `permissions?`).
- Лэйауты подключает `vite-plugin-vue-layouts-next` из `src/app/layouts/`; `default.vue` — это оболочка (sidebar + header + `<router-view/>` + footer).

### Управление состоянием — Pinia setup-стoры

Все сторы — в композиционном стиле `defineStore('name', () => { ... })` с `ref/computed/function` (не Options API). `defineStore`, `storeToRefs`, `ref`, `computed` и т. д. **авто-импортируются** — не добавляй явных `import` для них.

**HTTP-клиент.** В [shared/api/](src/shared/api/) — `class HttpClient` (fetch, [ADR-0006](docs/adr/0006-fetch-based-http-client.md)) с DI auth-interceptor и single-flight refresh-mutex. Использовать через `getHttpClient()` из `@/shared/api`. Инстанс собирается в [app/providers/setup-http-client.ts](src/app/providers/setup-http-client.ts), не создавай вручную. Контракт backend и `HttpError`-формат — [docs/integration-backend.md](docs/integration-backend.md).

Модель авторизации живёт в [entities/user](src/entities/user/):
- **DTO ↔ Domain.** Контракт backend и domain-модель разделены ([ADR-0005](docs/adr/0005-dto-domain-mapping.md)): `api/user.dto.ts` описывает форму ответа `UserResponseDto` (camelCase, status enum, nullable email/phone, см. [docs/integration-backend.md](docs/integration-backend.md)), `schema/user.schema.ts` — Domain-модель `User = z.infer<typeof userSchema>`, `api/user.mapper.ts` — `toUser(dto)`. В [api/index.ts](src/entities/user/api/index.ts) `GET /users/me` → `userDtoSchema.safeParse` → mapper. `UserDto` за пределы `api/`-сегмента **не выходит**.
- **RBAC.** Vocabulary прав живёт в [shared/model/permission/](src/shared/model/permission/) ([ADR-0004](docs/adr/0004-rbac-vocabulary-in-shared.md)) — `permissionSchema` и тип `PermissionCode`. Backend отдаёт только `roles: string[]`, фронт превращает их в permissions через `rolesToPermissions()` (`shared/model/permission/role-permissions.ts`). Хелпер `can(permission)` ([lib/can.ts](src/entities/user/lib/can.ts)) и `userStore.hasPermission()` основаны на этом маппинге. Sidebar фильтрует пункты, router-guard проверяет `meta.permissions`.

**Auth & error-handling.** `useAuthStore.login/refresh/logout` поверх HTTP-клиента дёргают `/auth/sign-in`, `/auth/refresh`, `/auth/sign-out`. Cross-entity-сценарии живут в [processes/auth-flow](src/processes/auth-flow/) — `loginFlow(email, password)` (orchestration: login + fetchCurrentUser с retry на 404 + compensating rollback) и `logoutFlow()` (гарантированная очистка auth+user через try/finally). Потребители: LoginPage, LogoutPage, `setup-http-client.ts` `onUnauthorized`. **Не дублируй cross-entity-логику в UI** — заводи новый процесс. Глобальные ошибки (Vue, unhandledrejection, window.error) ловит [setup-error-handler](src/app/providers/setup-error-handler.ts) → notification-store ([entities/notification](src/entities/notification/)) → `<v-snackbar>` стек ([widgets/app-notifications](src/widgets/app-notifications/), подключён в оба layout'а). Локальные ошибки бизнес-flow (например, LoginPage) ловятся inline через `try/catch`, не пускаются в глобальный handler.

**Layouts.** `default.vue` (sidebar + header + main + footer) и `auth.vue` (центрированная карточка без навигации). Включается через `definePage({ meta: { layout: 'auth' } })`.

### Конвенции, заданные тулчейном

- **Auto-imports** ([vite.config.mts](vite.config.mts), плагин `AutoImport`): Vue Composition API, хелперы vue-router и `defineStore`/`storeToRefs` доступны глобально. Сгенерированные `src/auto-imports.d.ts` и `.eslintrc-auto-import.json` закоммичены — пересобираются при `dev`/`build`, руками не редактируй.
- **Авто-регистрация компонентов** сканирует `src/shared/components/**` (объявлено в `Components({ dirs })`). Компоненты в других местах — включая `src/widgets/**` и `src/shared/ui/**` — нужно импортировать явно через barrel `index.ts` слайса.
- **UI-стек** ([ADR-0007](docs/adr/0007-ui-stack-migration-from-vuetify.md), Фазы 2.5-2.9 закрыты). Полностью на **shadcn-vue + reka-ui + Tailwind v4 + design tokens** ([src/shared/assets/tokens/](src/shared/assets/tokens/)). 11 обёрток в [src/shared/ui/base/](src/shared/ui/base/) (Button, Card, TextField, Alert, Menu, Snackbar, List/ListItem, Divider, Spacer, Form, Icon). Shell ([app/App.vue](src/app/App.vue), [app/layouts/](src/app/layouts/), `widgets/app-{header,sidebar,footer}`) — на нативном HTML + Tailwind grid/flex. Иконки — `@lucide/vue` + словарь `MDI_TO_LUCIDE` внутри [Icon.vue](src/shared/ui/base/icon/Icon.vue) (потребители принимают `mdi-*` имена для совместимости). Тема — composable `useTheme()` из [shared/lib/theme/](src/shared/lib/theme/) (mode `light/dark/system` + persist в localStorage + sync `.dark` класса на html). Anti-FOUC inline-script в [index.html](index.html). Vuetify полностью удалён из проекта.
- Brand-типы Zod (например, `Phone` в [shared/model/phone/phone.schema.ts](src/shared/model/phone/phone.schema.ts)) маркированы `.brand<'Phone'>()` — принимай brand-тип в API, которым нужно уже провалидированное значение.

### Окружение

Runtime-конфигурация — `import.meta.env.VITE_*` (объявлено в [env.d.ts](env.d.ts), значения в `.env`), валидируется через Zod в [src/shared/config/env.ts](src/shared/config/env.ts) при первом импорте — невалидный env обрушит приложение со списком issues. В коде используй `env.VITE_API_URL` из `@/shared/config`, не дёргай `import.meta.env` напрямую. Подробнее — [docs/reference/env.md](docs/reference/env.md).

В dev фронт идёт к [`njs-server`](docs/integration-backend.md) через Vite proxy (`/api → http://localhost:3001`), в prod — `VITE_API_URL` это полный URL.

## Документация

Перед нетривиальной правкой архитектуры или конвенций — сверься со следующими файлами. Они **источник истины** для правил проекта:

| Файл | Когда читать |
|------|--------------|
| [docs/architecture.md](docs/architecture.md) | Перед изменениями структуры слоёв, bootstrap-потока, routing, RBAC |
| [docs/adr/](docs/adr/) | Принятые архитектурные решения (FSD, Pinia setup-stores, Zod). Не нарушай — либо предложи новый ADR |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Правила импортов FSD, naming, public API через `index.ts` |
| [ROADMAP.md](ROADMAP.md) | Какие улучшения уже запланированы (не предлагай дубли) |
| [KNOWN-ISSUES.md](KNOWN-ISSUES.md) | Известные баги — не «открывай» повторно, не предлагай локальный фикс симптома, если есть план в ROADMAP |
| [docs/how-to/add-page.md](docs/how-to/add-page.md), [docs/how-to/add-entity.md](docs/how-to/add-entity.md) | Пошаговые рецепты типичных задач |
| [docs/reference/](docs/reference/) | Справочники по командам, env, auto-imports |
| [.claude/docs-check.md](.claude/docs-check.md) | Конфиг skill `/docs-check` — что обязательно проверять при аудите доков |

Меняешь архитектуру → обнови `docs/` и заведи ADR в том же PR.

### Аудит документации

После любых правок в `src/`, затрагивающих публичные конвенции (новый слой, новый стор, изменение сегментной структуры, новая env-переменная, новый ADR), запусти `/docs-check` — skill проверит, не разъехалась ли документация с кодом, и предложит точечные правки. Сам skill ничего не правит без подтверждения.
