# 0004. RBAC: vocabulary в `shared/`, хелпер в `entities/user`

- **Status:** accepted
- **Date:** 2026-05-22

## Context

RBAC в текущем коде наполовину собран и наполовину сломан:

- `permissionSchema` объявлен внутри [src/entities/user/schema/user.schema.ts](../../src/entities/user/schema/user.schema.ts) — это `z.enum(['user.read', 'user.update', 'user.delete', 'role.manage'])`.
- Хелпер `can(permission)` лежит в [src/entities/user/lib/can.ts](../../src/entities/user/lib/can.ts) и импортирует `PermissionCode` из несуществующего `../model/types`.
- [src/widgets/app-sidebar/model/sidebar-items.ts](../../src/widgets/app-sidebar/model/sidebar-items.ts) импортирует `PermissionCode` из несуществующего `@/entities/permission`.

См. [KNOWN-ISSUES.md](../../KNOWN-ISSUES.md), пункты 2-3 и [ROADMAP.md](../../ROADMAP.md), Фаза 0.

Нужно зафиксировать **где живёт vocabulary прав** (набор кодов и его тип) и **где живёт логика проверки прав** (`can`). Рассмотрены три варианта:

1. **Отдельный слайс `entities/permission/`.** Звучит логично («permission — самостоятельная бизнес-сущность»), но `entities/user/schema/user.schema.ts` должен использовать `permissionSchema` в поле `permissions: PermissionCode[]`. Соседи на одном слое не импортируют друг друга ([CONTRIBUTING.md](../../CONTRIBUTING.md) § Правила импортов, [ADR-0001](0001-feature-sliced-design.md)). Этот вариант сразу требует cross-import-исключения, а оно не оправдано для словарного enum'а.

2. **Внутри `entities/user/`.** Прагматично: permission'ы приходят как поле `User`. Но это привязывает vocabulary к одной сущности — `widgets/app-sidebar` для одного типа `PermissionCode` тянет зависимость от User, что концептуально некорректно (sidebar знает «какие бывают права», а не «какие права у пользователя»).

3. **В `shared/model/permission/`.** По аналогии с `shared/model/phone/`: vocabulary без бизнес-поведения и без зависимости от конкретного состояния — типичный кандидат на `shared/`. Любой слой может импортировать тип без нарушения FSD-правил. Бизнес-логика проверки (`can`) — отдельная история, она остаётся выше.

Параллельно нужно определить место `can()`. Он зовёт `useUserStore()` → не может жить ниже `entities/user`. Логично оставить его там, где он и сейчас: [entities/user/lib/can.ts](../../src/entities/user/lib/can.ts).

## Decision

1. **Vocabulary прав** живёт в **`src/shared/model/permission/`**:
   ```
   src/shared/model/permission/
   ├── permission.schema.ts   ← z.enum + type PermissionCode = z.infer<typeof permissionSchema>
   └── index.ts               ← публичный API (barrel)
   ```

2. **`entities/user/schema/user.schema.ts`** импортирует `permissionSchema` из `@/shared/model/permission`:
   ```ts
   import { permissionSchema } from '@/shared/model/permission'
   // ...
   permissions: z.array(permissionSchema).default([]),
   ```

3. **`can(permission: PermissionCode)`** остаётся в [src/entities/user/lib/can.ts](../../src/entities/user/lib/can.ts). Импорт `PermissionCode` чинится на `@/shared/model/permission`.

4. **Sidebar** ([src/widgets/app-sidebar/model/sidebar-items.ts](../../src/widgets/app-sidebar/model/sidebar-items.ts)) импортирует `PermissionCode` из `@/shared/model/permission`.

5. **Декларативные обёртки** (`<Can permission="...">`, директива `v-can`) — отдельная задача, см. [ROADMAP.md](../../ROADMAP.md), Фаза 2. Это ADR их скоупа не определяет.

6. **Проверка `meta.permissions` в router-guard** — отдельная задача ([ROADMAP.md](../../ROADMAP.md), Фаза 1). Когда дойдём — guard также импортирует `PermissionCode` из `@/shared/model/permission`.

## Consequences

### Положительные

- **Соблюдено FSD-правило одностороннего импорта.** Никаких cross-import-исключений.
- **Vocabulary доступен любому слою** — widgets, features, processes — без зависимости от `entities/user`.
- **Расширение списка прав** — правка одного файла `permission.schema.ts`, без затрагивания user-слайса.
- **Симметрия с `shared/model/phone/`** — единый паттерн для «общесистемных vocabulary с brand/enum».

### Отрицательные

- **Enum в `shared/` теряет «контекст бизнес-сущности»** — на первый взгляд permission'ы выглядят как domain-понятие. Митигация: в FSD `shared/` — это «то, что не зависит от бизнеса конкретной сущности». Codes-as-enum под это определение подходят: backend может прислать любые из них, любому слою UI может потребоваться их рендерить.
- **Если в будущем потребуется реальная сущность Permission** (CRUD permission'ов с описаниями, локализацией, иерархией) — придётся вводить `entities/permission/`, **но** vocabulary в `shared/` всё равно останется как «список кодов»; полная сущность будет надстройкой над ним. Этот сценарий пока спекулятивен.

### Что меняется в коде

- Создать `src/shared/model/permission/permission.schema.ts` с `permissionSchema` (перенос из `user.schema.ts`) и типом `PermissionCode`.
- Создать `src/shared/model/permission/index.ts` (barrel).
- Из `src/entities/user/schema/user.schema.ts` удалить локальное объявление `permissionSchema`, импортировать из `@/shared/model/permission`.
- Починить импорт в `src/entities/user/lib/can.ts` (`PermissionCode` → `@/shared/model/permission`).
- Починить импорт в `src/widgets/app-sidebar/model/sidebar-items.ts` (`@/entities/permission` → `@/shared/model/permission`).
- Обновить [KNOWN-ISSUES.md](../../KNOWN-ISSUES.md) (пункты 2-3) и [ROADMAP.md](../../ROADMAP.md) (Фаза 0, [P0] про `entities/permission/`) — отразить выбранный путь.
- Обновить [docs/architecture.md](../architecture.md) § RBAC.

## Альтернативы (для истории)

- **`entities/permission/` как отдельный слайс** — отклонён: нарушает FSD-правило соседних импортов без бизнес-оправдания. Был зафиксирован в KNOWN-ISSUES изначально, переосмыслен в пользу `shared/model/`.
- **`permissionSchema` внутри `entities/user/`** — отклонён: привязывает vocabulary к одной сущности; widgets-слой не должен зависеть от User ради одного типа.
- **`features/rbac/`** — overkill для текущей фазы. Имеет смысл, если появится сложная декларативная логика (`<Can>`, `v-can`, политики).

## Ссылки

- [ADR-0001](0001-feature-sliced-design.md) — FSD-слои и правила импортов.
- [ADR-0003](0003-zod-as-source-of-truth.md) — Zod как источник истины.
- [src/shared/model/phone/phone.schema.ts](../../src/shared/model/phone/phone.schema.ts) — прецедент для vocabulary в `shared/model/`.
- [KNOWN-ISSUES.md](../../KNOWN-ISSUES.md) — пункты 2-3 (исходная формулировка).
