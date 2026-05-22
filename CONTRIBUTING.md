# Contributing

Краткие правила, по которым живёт репозиторий. Подробнее об архитектуре — [docs/architecture.md](docs/architecture.md).

## Язык

Всё общение, обсуждения, описания PR, коммиты, документация — на **русском**. Код, идентификаторы, имена файлов — на английском.

## Workflow

1. Ветка от `main`: `feat/<scope>`, `fix/<scope>`, `docs/<scope>`, `refactor/<scope>`, `chore/<scope>`.
2. Локально: `npm run lint && npm run type-check`.
3. Conventional Commits для сообщений коммитов:
   - `feat(user): add profile menu`
   - `fix(router): restore session before guard`
   - `docs(adr): accept FSD as primary layering`
4. PR в `main`. Описание содержит: что меняется, почему, как тестировать.
5. Если меняешь архитектуру или конвенции — обнови `docs/` **в том же PR**.

## Правила импортов (FSD)

Слои импортируются строго сверху вниз. Нарушение этого правила — главный способ убить FSD-проект:

```
shared  →  entities  →  features  →  widgets  →  pages  →  app
                                                 processes ─┘
```

Слой может импортировать **только из нижних** слоёв. `entities/user` не знает про `widgets/app-sidebar`. `shared/` не знает ни про что выше.

Импорт из соседнего слайса того же слоя **запрещён** (например, `entities/user` не должен импортировать из `entities/auth`). Если нужна совместная работа двух сущностей — оркестрация делается в `processes/` или `features/`.

## Public API через `index.ts`

Каждый слайс отдаёт наружу **только** то, что экспортировано из его `index.ts` (паттерн barrel):

```ts
// ✅ можно
import { useUserStore } from '@/entities/user'

// ❌ нельзя
import { useUserStore } from '@/entities/user/model/user.store'
```

Внутренняя структура слайса (`ui/`, `model/`, `api/`, …) может меняться без оповещения мира. Меняется только `index.ts` — это контракт.

## Сегментная конвенция внутри слайса

Внутри `entities/<name>/`, `widgets/<name>/`, `features/<name>/` используются стандартные сегменты:

| Сегмент | Что лежит |
|---------|-----------|
| `ui/` | Vue-компоненты |
| `model/` | сторы, типы, бизнес-логика |
| `api/` | запросы к backend |
| `lib/` | чистые функции, хелперы |
| `schema/` | Zod-схемы и выводимые типы |

Создавай только нужные сегменты. Не плоди пустые папки.

## Naming

| Что | Конвенция | Пример |
|-----|-----------|--------|
| Файл страницы (FSD) | `<Name>Page.vue` внутри `ui/` | `pages/dashboard/ui/DashboardPage.vue` |
| Плоский файл страницы | `<name>.vue` | `pages/ui-kit/buttons.vue` |
| Слайс | `kebab-case` | `entities/user`, `widgets/app-sidebar` |
| Стор-файл | `<name>.store.ts` | `user.store.ts` |
| Схема | `<name>.schema.ts` | `user.schema.ts` |
| Компонент | `PascalCase.vue` | `AppHeader.vue` |
| Composable | `use<Name>` | `useAsyncStatus()` |
| Pinia-стор id | строка `kebab-case` в `defineStore('user', …)` | |

## Стиль кода

- TypeScript обязателен. `any` — только с комментарием почему.
- Setup-API, не Options API.
- Auto-imports включены (см. [docs/reference/auto-imports.md](docs/reference/auto-imports.md)) — не дублируй `import { ref } from 'vue'`.
- Запрет `console.log` в коммитах в `main` (отладочное — удалять перед PR).
- Схемы Zod — **источник истины** для типов. Не объявляй параллельный TS-тип, используй `z.infer`.

## Что не коммитим

- `console.*`, `debugger`.
- Закомментированный код «на потом» — есть Git history.
- Сгенерированные файлы вручную (`auto-imports.d.ts`, `components.d.ts`, `typed-router.d.ts`) — они регенерируются плагинами Vite. Менять `.d.ts` руками **нельзя**.
- Файлы с секретами (`.env.local`, `.env.production`).

## Документация

- Меняешь архитектуру → пиши/обновляй ADR в [docs/adr/](docs/adr/).
- Появилась новая «как добавить X» — рецепт в [docs/how-to/](docs/how-to/).
- Нашёл баг → запиши в [KNOWN-ISSUES.md](KNOWN-ISSUES.md) (если не чинишь в этом же PR).
- Предложил архитектурное улучшение → добавь пункт в [ROADMAP.md](ROADMAP.md) со статусом `proposed`.

## Проверка перед PR

```bash
npm run lint        # ESLint + автофикс
npm run type-check  # vue-tsc
npm run build       # сборка должна проходить
```

Если в PR менялись файлы в `src/` — запусти Claude Code и выполни `/docs-check`. Skill сверит документацию с фактическим состоянием кода и предложит точечные правки (см. [.claude/docs-check.md](.claude/docs-check.md) — project-config с правилами).
