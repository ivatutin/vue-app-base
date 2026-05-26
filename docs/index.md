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
