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
npm run lint         # eslint . --fix (конфиг: eslint-config-vuetify)
npm run preview      # Предпросмотр production-сборки
```

Тестовый раннер не настроен. Команды для запуска одного теста нет.

## Архитектура

Проект построен по **Feature-Sliced Design (FSD)**. Слои внутри `src/` (сверху вниз — верхние слои могут импортировать из нижних, но не наоборот):

```
app/        composition root, провайдеры, лэйауты, App.vue, main.ts
processes/  длительные многошаговые сценарии (например, app-bootstrap)
pages/      маршрутные страницы — file-based routing
widgets/    самостоятельные блоки лэйаута (app-header, app-sidebar, ...)
features/   пользовательские сценарии (зарезервирован, пока пуст / закомментирован в vite.config.mts)
entities/   бизнес-сущности (user, auth, bootstrap) — здесь же Pinia-сторы
shared/     переиспользуемая инфраструктура: lib/utils, ui/base, model (Zod-схемы)
```

Внутри каждого слайса используется **сегментная конвенция** `ui / model / api / lib / schema`. Каждый слайс отдаёт **публичный API через `index.ts`** (barrel) — импортируй из `@/widgets/app-sidebar`, а не из внутренних файлов. Алиас `@/` указывает на `src/`.

### Процесс bootstrap — неочевидный момент

[src/app/main.ts](src/app/main.ts) намеренно монтирует приложение **до** запуска асинхронного bootstrap, чтобы splash-экран отрисовался сразу:

1. `createApp(App)` → `setupProviders(app)` регистрирует Pinia, Vuetify, Router.
2. `app.mount('#app')` — на этом этапе [App.vue](src/app/App.vue) показывает `<AppPreloader/>`, потому что стор `bootstrap` всё ещё в состоянии `idle`.
3. `runBootstrapProcess({ router })` ([processes/app-bootstrap/bootstrap.process.ts](src/processes/app-bootstrap/bootstrap.process.ts)) переключает FSM bootstrap `idle → initializing → ready | failed`, ждёт `router.isReady()`, и только после этого рендерится `<v-app>` с `<router-view/>`.

Стор bootstrap — это **конечный автомат** ([entities/bootstrap/bootstrap.store.ts](src/entities/bootstrap/bootstrap.store.ts) со status + error + actions `start/finish/fail/reset`. Держи `entities/bootstrap` (состояние) и `processes/app-bootstrap` (оркестрация) раздельно.

### Маршрутизация — file-based с FSD-aware резолвером пути

Маршруты генерирует `unplugin-vue-router`. Кастомный резолвер в [vite.config.mts](vite.config.mts) маппит `src/pages/<group>/ui/<Name>Page.vue` → URL `/<group>`, чтобы страница могла быть FSD-слайсом со своими сегментами `ui/`, `model/`, ..., а не плоским файлом. Обычные файлы вроде `src/pages/ui-kit/buttons.vue` обрабатываются стандартной логикой.

- Внутри страницы meta задаётся через макрос `definePage({ meta: { ... } })` (авто-импорт), а не правкой записей маршрутов.
- Auth-guard ([app/providers/setup-router.ts](src/app/providers/setup-router.ts)) работает как **whitelist по `meta.noAuth`** — любой маршрут без `noAuth: true` требует `useUserStore().isAuthorized`.
- Сгенерированные типы маршрутов лежат в `src/typed-router.d.ts` (закоммичено). Тонкий момент: путь к системным страницам написан с опечаткой как `pages/systesm/` — совпадающая директория существует, не «исправляй» её без обновления маршрутов и ссылок.
- Лэйауты подключает `vite-plugin-vue-layouts-next` из `src/app/layouts/`; `default.vue` — это оболочка (sidebar + header + `<router-view/>` + footer).

### Управление состоянием — Pinia setup-стoры

Все сторы — в композиционном стиле `defineStore('name', () => { ... })` с `ref/computed/function` (не Options API). `defineStore`, `storeToRefs`, `ref`, `computed` и т. д. **авто-импортируются** — не добавляй явных `import` для них.

Модель авторизации живёт в [entities/user](src/entities/user/):
- **DTO ↔ Domain.** Контракт backend и domain-модель разделены ([ADR-0005](docs/adr/0005-dto-domain-mapping.md)): `api/user.dto.ts` описывает форму ответа (snake_case), `schema/user.schema.ts` — domain-модель `User = z.infer<typeof userSchema>` (camelCase), `api/user.mapper.ts` — `toUser(dto)`. В [api/index.ts](src/entities/user/api/index.ts) ответ парсится через `userDtoSchema.safeParse`, прогоняется через mapper, наружу уходит только `User`. `UserDto` за пределы `api/`-сегмента **не выходит**.
- **RBAC.** Vocabulary прав живёт в [shared/model/permission/](src/shared/model/permission/) ([ADR-0004](docs/adr/0004-rbac-vocabulary-in-shared.md)) — `permissionSchema` и тип `PermissionCode`. Хелпер `can(permission)` ([lib/can.ts](src/entities/user/lib/can.ts)) остаётся в `entities/user/lib/`, потому что зависит от `useUserStore()`. Сайдбар фильтрует пункты с его помощью ([widgets/app-sidebar/ui/AppSidebar.vue](src/widgets/app-sidebar/ui/AppSidebar.vue)).

### Конвенции, заданные тулчейном

- **Auto-imports** ([vite.config.mts](vite.config.mts), плагин `AutoImport`): Vue Composition API, хелперы vue-router и `defineStore`/`storeToRefs` доступны глобально. Сгенерированные `src/auto-imports.d.ts` и `.eslintrc-auto-import.json` закоммичены — пересобираются при `dev`/`build`, руками не редактируй.
- **Авто-регистрация компонентов** сканирует `src/shared/components/**` (объявлено в `Components({ dirs })`). Компоненты в других местах — включая `src/widgets/**` и `src/shared/ui/**` — нужно импортировать явно через barrel `index.ts` слайса.
- Vuetify импортируется с `autoImport: true`, стили подхватываются из [src/assets/styles/settings.scss](src/assets/styles/settings.scss).
- Brand-типы Zod (например, `Phone` в [shared/model/phone/phone.schema.ts](src/shared/model/phone/phone.schema.ts)) маркированы `.brand<'Phone'>()` — принимай brand-тип в API, которым нужно уже провалидированное значение.

### Окружение

Runtime-конфигурация читается одновременно из `import.meta.env.VITE_*` (объявлено в [env.d.ts](env.d.ts), значения в `.env`) и из статического [src/assets/config.json](src/assets/config.json). При добавлении новых env-переменных обязательно объявляй их в `env.d.ts`, иначе сломается типизация.

> ⚠ Дубль `.env` ↔ `config.json` — тех-долг. Не плоди новые ключи в `config.json`, используй `.env`. Решение запланировано в [ROADMAP.md](ROADMAP.md) (Фаза 1, Zod-валидация env).

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
