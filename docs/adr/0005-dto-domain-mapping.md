# 0005. Разделение DTO ↔ Domain для всех сущностей с API

- **Status:** accepted
- **Date:** 2026-05-22

## Context

[ADR-0003](0003-zod-as-source-of-truth.md) (Zod как источник истины) явно отметил **соблазн смешения** API-контракта и domain-модели:

> Если backend возвращает snake_case, а UI хочет camelCase — нельзя описывать это одной схемой.

Прецедент уже есть в коде: [src/entities/user/schema/user.schema.ts](../../src/entities/user/schema/user.schema.ts) описывает поля `is_active`, `full_name`, `created_at` (snake_case backend-стиль), при этом [user.store.ts](../../src/entities/user/model/user.store.ts) обращается к `user.value.isActive` (camelCase) — что даёт `undefined`, ломает `isAuthorized` и роняет приложение в бесконечный редирект на login (см. [KNOWN-ISSUES.md](../../KNOWN-ISSUES.md), пункт 1).

В [ROADMAP.md](../../ROADMAP.md) этот пункт стоял в Фазе 2 («когда появится реальный backend»). Однако:

- Баг с `is_active`/`isActive` уже происходит — родом из этой нерешённости.
- Фикс P0 #1 без разделения DTO/Domain создаст тех-долг, который надо будет переделывать при появлении реального backend.
- Любая новая сущность с API-доступом будет копировать ту же неоднозначность.

Решено **поднять этот пункт в Фазу 0** и сразу зафиксировать паттерн для всех будущих сущностей.

Рассмотрены три варианта:

1. **Чистый camelCase в одной схеме, без mapper'а.** Domain-схема в camelCase, ответ backend (если snake_case) пре-обрабатывается ad-hoc в `api/`. Сейчас проще всего, но при появлении реального backend придётся вводить разделение и переделывать фикс P0 #1.

2. **DTO ↔ Domain ↔ Mapper, три файла на сущность.** Чёткое разделение «контракт API» и «domain-модель»; маппер — единственная точка преобразования. Бóльший boilerplate (+2 файла на сущность), но снимает целый класс проблем.

3. **`.transform()` внутри одной Zod-схемы.** Zod умеет: `.object({ is_active: z.boolean() }).transform(d => ({ isActive: d.is_active }))`. Один файл, но контракт backend «тонет» внутри схемы — читателю непонятно, что приходит снаружи; mapper-логика плохо тестируется в отрыве; нельзя переиспользовать DTO в формах создания.

Выбран вариант 2 — несмотря на +2 файла на сущность. Причина: проект целится в долгую перспективу (B2B-SPA, 30+ страниц, команда 3+, см. [ADR-0001](0001-feature-sliced-design.md)), а кост разделения — линейный (`O(сущностей)`), тогда как кост ad-hoc «выпрямлений» в `api/` — суперлинейный (любое поле backend → правка во всех потребителях).

## Decision

**Каждая сущность с API-доступом получает три файла:**

```
entities/<x>/
├── api/
│   ├── <x>.dto.ts        ← Zod-схема DTO (контракт backend «как есть»)
│   ├── <x>.mapper.ts     ← to<X>(dto: <X>Dto): <X>
│   └── index.ts          ← async-функции запросов (возвращают Domain, не DTO)
├── schema/
│   └── <x>.schema.ts     ← Zod-схема Domain-модели (camelCase)
└── ...
```

**Правила:**

1. **DTO-схема** описывает форму, в которой данные приходят от backend — со всеми её особенностями (snake_case, лишние поля, форматы дат как строки). Тип: `type <X>Dto = z.infer<typeof <x>DtoSchema>`. Живёт в `api/<x>.dto.ts`, потому что DTO семантически принадлежит API-контракту, а не domain.

2. **Domain-схема** описывает форму, в которой данные используются внутри приложения — всегда camelCase, всегда «правильные» типы (`Date` вместо строки и т.п.). Тип: `type <X> = z.infer<typeof <x>Schema>`. Живёт в `schema/<x>.schema.ts` — это сегмент для domain-схем.

3. **Mapper** — чистая функция `to<X>(dto: <X>Dto): <X>`. Живёт в `api/<x>.mapper.ts`. Если контракт backend уже в camelCase — mapper тривиален, но **всё равно создаётся** (декларация: «вот граница, здесь конвертируется контракт»).

4. **API-функция** парсит raw-ответ через `dtoSchema.safeParse`, прогоняет через mapper, возвращает Domain. **DTO дальше `api/`-сегмента не выходит.** Сторы, UI, composables — оперируют только Domain.

5. **Mapper в обратную сторону** (`fromX(model: X): XDto`) — создаётся только когда фактически нужен (PUT/POST с тем же контрактом). Не делать «на будущее».

**Пример (минимальный):**

```ts
// entities/user/api/user.dto.ts
import { z } from 'zod'

export const userDtoSchema = z.object({
  id: z.uuid(),
  full_name: z.string().max(31).trim(),
  email: z.email(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  // ...
})

export type UserDto = z.infer<typeof userDtoSchema>
```

```ts
// entities/user/schema/user.schema.ts
import { z } from 'zod'
import { permissionSchema } from '@/shared/model/permission'
import { phoneSchema } from '@/shared/model/phone'

export const userSchema = z.object({
  id: z.uuid(),
  fullName: z.string().max(31).trim(),
  phone: phoneSchema,
  email: z.email(),
  roles: z.array(z.string()).default([]),
  permissions: z.array(permissionSchema).default([]),
  isActive: z.boolean(),
  createdAt: z.date(),
})

export type User = z.infer<typeof userSchema>
```

```ts
// entities/user/api/user.mapper.ts
import type { UserDto } from './user.dto'
import type { User } from '../schema/user.schema'

export function toUser(dto: UserDto): User {
  return {
    id: dto.id,
    fullName: dto.full_name,
    phone: dto.phone,
    email: dto.email,
    roles: dto.roles,
    permissions: dto.permissions,
    isActive: dto.is_active,
    createdAt: dto.created_at,
  }
}
```

```ts
// entities/user/api/index.ts
import { userDtoSchema } from './user.dto'
import { toUser } from './user.mapper'
import type { User } from '../schema/user.schema'

export async function getCurrentUser(): Promise<User> {
  const raw = await fetch(/* ... */).then(r => r.json())
  const parsed = userDtoSchema.safeParse(raw)
  if (!parsed.success) return Promise.reject(parsed.error)
  return toUser(parsed.data)
}
```

## Consequences

### Положительные

- **Снят целый класс багов** уровня `is_active` vs `isActive` — UI оперирует Domain, который заведомо в camelCase.
- **Чёткая граница «снаружи / внутри».** Открываешь `api/<x>.dto.ts` — видишь форму, в которой приходит контракт. Открываешь `schema/<x>.schema.ts` — видишь то, с чем работает UI.
- **Правка поля backend локализована** в DTO-схему + mapper. Domain, сторы, UI не трогаются.
- **Domain может содержать computed-поля** (например, `displayName`, `isAdmin`) без правки контракта.
- **Тестируемость.** Mapper — чистая функция, легко покрывается unit-тестами (Vitest, когда подключится — [ROADMAP.md](../../ROADMAP.md), Фаза 2).
- **Готовность к разным контрактам.** Если в будущем появится второй backend (legacy + new), Domain остаётся стабильным — добавляется второй DTO + mapper.

### Отрицательные

- **+2 файла на сущность.** Для сущности с тривиальным контрактом mapper выглядит как boilerplate. Митигация: договор «всегда создаём, даже тривиальный» убирает решение «нужен или нет» из каждого PR.
- **Дублирование структуры в DTO и Domain.** Любая правка поля = правка в двух местах + mapper. Митигация: TS-вывод не даст забыть поле — если в Domain добавили field, mapper не скомпилится без него.
- **Дисциплина.** Без code-review/линта DTO может «утечь» в стор или UI. Митигация: PR-правило «DTO-типы не экспортируются из `api/index.ts`» (только через mapper).

### Что меняется в коде

- В рамках фикса P0 #1 ([KNOWN-ISSUES.md](../../KNOWN-ISSUES.md), пункт 1):
  - Создать `src/entities/user/api/user.dto.ts` — текущая схема (snake_case).
  - Переписать `src/entities/user/schema/user.schema.ts` под Domain-модель в camelCase.
  - Создать `src/entities/user/api/user.mapper.ts` — `toUser(dto)`.
  - Обновить `src/entities/user/api/index.ts` — парсить через DTO-схему и гонять через mapper.
  - Обновить `src/entities/user/index.ts` — экспортировать `User` (Domain), `UserDto` **не экспортировать** (он внутренний для api/-сегмента).
- Для всех новых сущностей с API — следовать этому паттерну.
- Обновить [ROADMAP.md](../../ROADMAP.md) — переместить пункт «DTO ↔ Domain model» из Фазы 2 в раздел `done` или удалить (зафиксировано здесь).
- Обновить [KNOWN-ISSUES.md](../../KNOWN-ISSUES.md), пункт 1 — указать, что чинится в рамках принятия этого ADR.
- Обновить [docs/architecture.md](../architecture.md) § State management § Schema-first типы — добавить про разделение DTO/Domain.
- Обновить [docs/how-to/add-entity.md](../how-to/add-entity.md) — отразить трёхфайловый паттерн.

## Альтернативы (для истории)

- **Чистый camelCase в одной схеме, без mapper.** Отклонено: при появлении реального backend пришлось бы переписывать; фикс P0 #1 пришлось бы делать дважды.
- **`.transform()` внутри одной Zod-схемы.** Отклонено: смешивает контракт и domain в одном объекте; читателю непонятно, что приходит снаружи; маппинг не тестируется в отрыве.
- **Mapper только когда backend snake_case** (опциональный паттерн). Отклонено: создаёт два разных стиля в проекте; решение «нужен или нет» возвращается в каждый PR.
- **Отложить на Фазу 2** (как было в ROADMAP). Отклонено: фикс P0 #1 без разделения создаёт переходный код, который придётся переделывать.

## Ссылки

- [ADR-0003](0003-zod-as-source-of-truth.md) — Zod как источник истины (обещание не смешивать DTO и Domain).
- [KNOWN-ISSUES.md](../../KNOWN-ISSUES.md), пункт 1 — баг, послуживший триггером.
- [ROADMAP.md](../../ROADMAP.md) — пункт «DTO ↔ Domain model» (Фаза 2) — закрывается этим ADR.
- [docs/architecture.md](../architecture.md) § State management.
