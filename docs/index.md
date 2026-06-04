# Документация `vue-app-base`

Карта документации. Организация — по схеме **Diátaxis-lite**: How-to (рецепты) / Reference (справочники) / Explanation (объяснения) + ADR-журнал.

## Начать здесь

- [../README.md](../README.md) — quickstart, требования, команды
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — правила контрибуции, FSD-импорты, naming

## Понять архитектуру (Explanation)

- [architecture.md](architecture.md) — FSD-слои, bootstrap-flow, routing, state, RBAC, auto-imports
- [diagrams/bootstrap-flow.md](diagrams/bootstrap-flow.md) — sequence-диаграмма потока загрузки
- [integration-backend.md](integration-backend.md) — контракт API `njs-server` (NestJS), auth-механика, формат ошибок, endpoints

## Принятые решения (ADR)

- [adr/0001-feature-sliced-design.md](adr/0001-feature-sliced-design.md) — выбор FSD как primary архитектуры
- [adr/0002-pinia-setup-stores.md](adr/0002-pinia-setup-stores.md) — composition-style сторов
- [adr/0003-zod-as-source-of-truth.md](adr/0003-zod-as-source-of-truth.md) — Zod как источник типов
- [adr/0004-rbac-vocabulary-in-shared.md](adr/0004-rbac-vocabulary-in-shared.md) — vocabulary прав в `shared/model/permission/`, `can()` в `entities/user/lib/`
- [adr/0005-dto-domain-mapping.md](adr/0005-dto-domain-mapping.md) — разделение DTO/Domain/Mapper для всех сущностей с API
- [adr/0006-fetch-based-http-client.md](adr/0006-fetch-based-http-client.md) — HTTP-клиент: fetch + DI auth-interceptor + refresh-mutex
- [adr/0007-ui-stack-migration-from-vuetify.md](adr/0007-ui-stack-migration-from-vuetify.md) — целевой UI-стек (shadcn-vue + Tailwind + Radix; PrimeVue / AG Grid / TipTap / FullCalendar опционально для сложных компонентов) и стратегия миграции с Vuetify через strangler fig
- [adr/0008-tanstack-query-for-server-state.md](adr/0008-tanstack-query-for-server-state.md) — TanStack Query как primary для серверного state параллельно Pinia (клиентский state). Разделение ответственности, queryKey-конвенции, bridge для RBAC.
- [adr/0009-design-language-inter-brand-accent.md](adr/0009-design-language-inter-brand-accent.md) — дизайн-язык: Inter Variable + нейтральная база с акцентом `--brand`, primitives состояний и командная палитра (brand-цвет уточнён в ADR-0014)
- [adr/0010-form-architecture-vee-validate-zod.md](adr/0010-form-architecture-vee-validate-zod.md) — VeeValidate 4 + `@vee-validate/zod` как primary form-инструмент; backward-compatible расширение `<Form :schema>` + `<TextField :name>` через field-context inject
- [adr/0011-otp-verification-model.md](adr/0011-otp-verification-model.md) — 6-digit OTP для phone (Redis + argon2id + SMS provider), email через Keycloak `sendVerifyEmail` magic link; unified `OtpChannel` + `OtpPurpose` контракт
- [adr/0012-error-coding-contract.md](adr/0012-error-coding-contract.md) — дисциплина `HttpError.errorName`: registry в `shared/api/error-codes.ts`, `matchError(err, code)` helper, anti-enumeration policy
- [adr/0013-keycloak-hybrid-integration.md](adr/0013-keycloak-hybrid-integration.md) — Strategy C: backend под капотом использует Keycloak Admin REST API, frontend single-page без redirect; полная boundary-таблица (25 capabilities)
- [adr/0014-brand-emerald-surface-elevation.md](adr/0014-brand-emerald-surface-elevation.md) — brand indigo → emerald (AA/AAA), фикс Tailwind v4 border-color, hairline-границы, surface/elevation модель и токен `--sidebar` (amends ADR-0009)

## Сделать конкретную задачу (How-to)

- [how-to/add-page.md](how-to/add-page.md) — добавить страницу
- [how-to/add-entity.md](how-to/add-entity.md) — добавить бизнес-сущность

## Справочники (Reference)

- [reference/commands.md](reference/commands.md) — npm-скрипты
- [reference/env.md](reference/env.md) — переменные окружения
- [reference/auto-imports.md](reference/auto-imports.md) — что доступно без `import`

## Развитие проекта

- [../ROADMAP.md](../ROADMAP.md) — план архитектурных улучшений по фазам
- [../KNOWN-ISSUES.md](../KNOWN-ISSUES.md) — найденные баги и тех-долг
- [../CLAUDE.md](../CLAUDE.md) — руководство для AI-агентов

## Auth/Registration suite (in planning)

- [auth-roadmap.md](auth-roadmap.md) — дорожная карта фаз 0-5, milestones, parallelization, risk register
- [backend-auth-implementation.md](backend-auth-implementation.md) — spec-level инструкция для backend dev (Keycloak realm setup + NestJS modules + per-endpoint спецификации)

---

## Как читать эту документацию

| Если ты... | Начни с |
|------------|---------|
| Только пришёл в проект | [../README.md](../README.md) → [architecture.md](architecture.md) → [how-to/add-page.md](how-to/add-page.md) |
| Хочешь понять, почему сделано так | [adr/](adr/) и [architecture.md](architecture.md) |
| Делаешь конкретную задачу | [how-to/](how-to/) |
| Ищешь «как настраивается X» | [reference/](reference/) |
| Хочешь улучшить архитектуру | [../ROADMAP.md](../ROADMAP.md) → новый ADR |

## Соглашения внутри документации

- **Ссылки на код** оформляются как `[file:line](path#Lline)` — клик ведёт к строке в GitHub/IDE.
- **Mermaid-диаграммы** живут в `.md` и рендерятся в GitHub / VS Code (плагин Markdown Preview Mermaid).
- **Diátaxis не смешивать:** how-to не объясняет «почему», explanation не пошаговое.
