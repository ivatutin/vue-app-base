# vue-app-base

Стартовый шаблон под B2B-SPA на **Vue 3 + shadcn-vue + reka-ui + Tailwind v4**. Архитектура — **Feature-Sliced Design** с типизированным file-based роутингом, setup-сторами Pinia и schema-first типизацией через Zod.

## Требования

- Node ≥ 22
- npm (`package-lock.json` коммитится)

## Быстрый старт

```bash
npm install
npm run dev          # → http://localhost:3000
```

## Команды

| Команда | Назначение |
|---------|-----------|
| `npm run dev` | Dev-сервер Vite с HMR |
| `npm run build` | Type-check (`vue-tsc`) + production-сборка параллельно |
| `npm run type-check` | Только type-check |
| `npm run lint` | ESLint с `--fix` |
| `npm run preview` | Предпросмотр production-сборки |

Подробнее — [docs/reference/commands.md](docs/reference/commands.md).

## Поддержка документации

`/docs-check` в Claude Code сверяет всю документацию с состоянием кода: находит сломанные ссылки, устаревшие упоминания символов, нарушения FSD-конвенций, расхождения между `architecture.md` и `CLAUDE.md`, покрытие ROADMAP/ADR. Конфиг с проектными правилами — [.claude/docs-check.md](.claude/docs-check.md).

## Документация

| Файл | Зачем |
|------|-------|
| [docs/index.md](docs/index.md) | Карта всей документации |
| [docs/architecture.md](docs/architecture.md) | Архитектура: FSD, слои, bootstrap-flow |
| [docs/how-to/add-page.md](docs/how-to/add-page.md) | Как добавить страницу |
| [docs/how-to/add-entity.md](docs/how-to/add-entity.md) | Как добавить бизнес-сущность |
| [docs/adr/](docs/adr/) | Принятые архитектурные решения |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Правила контрибуции и конвенции |
| [ROADMAP.md](ROADMAP.md) | План архитектурных улучшений |
| [KNOWN-ISSUES.md](KNOWN-ISSUES.md) | Известные баги |
| [CLAUDE.md](CLAUDE.md) | Руководство для AI-агентов (Claude Code) |

## Стек

- **Vue 3.5** (Composition API, `<script setup>`)
- **UI:** shadcn-vue + reka-ui + Tailwind v4 + @lucide/vue + design tokens ([ADR-0007](docs/adr/0007-ui-stack-migration-from-vuetify.md)). 11 доменных обёрток в `shared/ui/base/`. Shell — нативный HTML + Tailwind. Своя тема (composable `useTheme()` + `.dark` class + localStorage + `prefers-color-scheme`)
- **Pinia 3** (setup-stores)
- **vue-router 4** + `unplugin-vue-router` (file-based, типизированный)
- **Zod 4** (валидация и источник типов)
- **Vite 7** + TypeScript 5.9
- **vite-plugin-vue-layouts-next** (лэйауты)
- **@vueuse/core**, `class-variance-authority`, `clsx`, `tailwind-merge`
- `unplugin-auto-import`, `unplugin-vue-components`
- **Vitest 4** + happy-dom + @vue/test-utils
- **Storybook 8** (для `shared/ui/base/`)

Весь UI-текст и общение в проекте — на **русском языке**.

## Лицензия

MIT.
