# docs-check: project rules

Дополнительные правила для skill [`docs-check`](https://docs.anthropic.com) (см. `~/.claude/skills/docs-check/SKILL.md`). Применяются при запуске `/docs-check` в этом репозитории **поверх** generic-проверок.

## Обязательные файлы документации

Skill обязан проверить наличие и консистентность:

| Файл | Назначение |
|------|-----------|
| `README.md` | Quickstart |
| `CLAUDE.md` | Руководство для AI |
| `CONTRIBUTING.md` | Правила контрибуции |
| `ROADMAP.md` | План улучшений |
| `KNOWN-ISSUES.md` | Известные баги |
| `docs/index.md` | Карта документации |
| `docs/architecture.md` | Главное объяснение архитектуры |
| `docs/adr/0001-*.md` | ADR-журнал, минимум 3 файла |
| `docs/how-to/add-page.md`, `add-entity.md` | Базовые рецепты |
| `docs/reference/commands.md`, `env.md`, `auto-imports.md` | Справочники |
| `docs/diagrams/bootstrap-flow.md` | Mermaid-диаграмма |

Отсутствие любого из них — 🔴.

## Источники истины

При расхождении документ ↔ источник побеждает **источник**. Документация подгоняется под источник.

| Что | Источник |
|-----|----------|
| Список слоёв FSD | фактическая структура `src/` |
| Конвенции импортов | `CONTRIBUTING.md` |
| Архитектурные решения (status) | `docs/adr/` |
| Известные баги | `KNOWN-ISSUES.md` |
| План улучшений | `ROADMAP.md` |
| npm-команды | `package.json` |
| Env-переменные | `env.d.ts` + `.env` |
| Маршруты | `src/typed-router.d.ts` |
| Auto-imports | `src/auto-imports.d.ts` |
| Компоненты | `src/components.d.ts` |

## Project-специфичные инварианты

### 1. KNOWN-ISSUES ↔ ROADMAP Фаза 0

Каждый P0/P1 пункт в `KNOWN-ISSUES.md` должен иметь соответствующий пункт в `ROADMAP.md`, Фаза 0/1. Если код, описанный в `KNOWN-ISSUES.md`, уже исправлен (например, проверить grep'ом текущее состояние) — пункт должен быть **удалён**.

Пример: `KNOWN-ISSUES.md` пункт 1 говорит «в схеме `is_active`, в сторе `isActive`». Если в схеме сейчас тоже `isActive` — баг закрыт, отметить как 🔴.

### 2. FSD-слои `architecture.md` ↔ `src/`

Список слоёв в `docs/architecture.md` (`app/`, `processes/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`) должен совпадать с реальной структурой `src/`.

- Появился новый слой в `src/` → должен быть упомянут в `architecture.md`.
- Слой удалён из `src/` → должен быть удалён из доки.

### 3. ADR consistency

Каждый файл в `docs/adr/` должен:

- Иметь имя вида `NNNN-<kebab-case-slug>.md`.
- Содержать заголовки в порядке: Status / Date / Context / Decision / Consequences.
- Status ∈ {`proposed`, `accepted`, `superseded by NNNN`, `deprecated`}.
- Date в формате `YYYY-MM-DD`.

Если ADR ссылается на «архитектурное решение, уже применённое в коде», но status = `proposed` — пометить 🟡.

### 4. CLAUDE.md ↔ architecture.md

Оба описывают одну архитектуру. Проверь, что **не противоречат** друг другу по:

- Именам и количеству слоёв FSD.
- Направлению импортов (`shared → entities → … → app`).
- Сегментной конвенции (`ui / model / api / lib / schema`).
- Ключевым решениям (Pinia setup-stores, Zod как источник истины).

При конфликте — источник истины **architecture.md** (он подробнее), CLAUDE.md подгоняется.

### 5. ROADMAP coverage

ROADMAP.md должен (как минимум) упоминать каждое из ключевых архитектурных направлений (хотя бы как `proposed`):

- HTTP-клиент / interceptors
- Zod-валидация env
- Глобальный error-handler
- AuthLayout
- RBAC в guard
- DTO ↔ Domain mapping
- Route data-loaders
- TanStack Query (или эквивалент для серверного state)
- Декларативная RBAC (`<Can>` или v-can)
- `usePageMeta`
- Vuetify-обёртка в `shared/ui/base`
- `processes/` для cross-entity сценариев
- Form architecture
- i18n
- ESLint-boundaries для FSD
- Husky + lint-staged + commitlint
- Vitest
- Sentry / observability
- Storybook
- CI
- Design tokens
- Event bus
- `useAsyncStatus` (если не выбран TanStack Query)

Отсутствие — 🟢.

### 6. ADR-coverage для применённых решений

В коде применены:
- FSD структура (`src/{app,processes,pages,widgets,entities,shared}`) → должен быть ADR-0001 (или эквивалент).
- Pinia setup-stores → должен быть ADR.
- Zod-схемы (`z.infer`) → должен быть ADR.

Если решение в коде применено, а ADR нет — 🟢.

### 7. Auto-imports reference ↔ `auto-imports.d.ts`

`docs/reference/auto-imports.md` упоминает группы (Vue Composition API, vue-router helpers, Pinia). Проверь, что `src/auto-imports.d.ts` действительно содержит эти символы. Если в коде добавлен новый auto-import, не упомянутый в reference, — 🟡.

### 8. typed-router.d.ts ↔ pages/

`src/typed-router.d.ts` автогенерируется. Если в `src/pages/` есть страница, которой нет в типах — нужно перегенерить (`npm run dev`). Это не баг доки, но **отметить как 🟡 с подсказкой** «запусти dev».

### 9. how-to ↔ architecture

`docs/how-to/add-page.md` и `add-entity.md` должны описывать те же сегменты (`ui/model/api/lib/schema`) и тот же стиль public API (через `index.ts`), что описаны в `docs/architecture.md`. При расхождении побеждает `architecture.md`.

### 10. Setup-stores rule (из ADR-0002)

В `src/entities/*/model/*.store.ts` и `src/processes/*/*.store.ts` все сторы должны использовать setup-style (`defineStore('name', () => { ... })`). Если найден options-style (`defineStore('name', { state, getters, actions })`) — нарушение ADR-0002, 🔴 + ссылка на файл.

### 11. Импорты через barrel (из CONTRIBUTING.md)

Проверь grep'ом, что нет импортов вида:

```
from '@/entities/<slice>/model/...'
from '@/entities/<slice>/api/...'
from '@/widgets/<slice>/ui/...'
```

Допустимы только:
```
from '@/entities/<slice>'
from '@/widgets/<slice>'
```

Исключение: внутри самого слайса (`entities/user/lib/can.ts` может импортировать `../model/types`).

Каждое нарушение — 🔴 (нарушает [ADR-0001](../docs/adr/0001-feature-sliced-design.md) и `CONTRIBUTING.md`).

### 12. Naming consistency

Если хотя бы в двух файлах документации одно и то же имя написано по-разному (`useUserStore` vs `userStore`, `IsActive` vs `isActive`) — 🟢 несоответствие, предложить унифицировать по источнику в коде.

## Что НЕ проверять

- Типизацию (работа `npm run type-check`).
- Lint (работа `npm run lint`).
- Тесты (не настроены).
- Сами баги в коде — только их корректное **упоминание** в доках.
- External URLs (vuejs.org, zod.dev и т.п.).

## Формат отчёта

После всех проверок выдай:

```
# docs-check report

## 🔴 Сломано (требует фикса)
- <file>:<line> — <problem> → <suggested fix>
...

## 🟡 Подозрительно
- ...

## 🟢 Несоответствия / предложения
- ...

## Итого
N 🔴 / M 🟡 / K 🟢. Проверено F файлов документации, R refs.

Применить фиксы по 🔴? (y / выбрать пункты / нет)
```

Без воды, без пересказа алгоритма, только находки.
