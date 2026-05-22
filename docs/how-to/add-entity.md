# How-to: добавить бизнес-сущность

Рецепт. Без «почему» — для этого [../architecture.md § FSD-слои](../architecture.md) и [../adr/0001-feature-sliced-design.md](../adr/0001-feature-sliced-design.md).

## Когда создавать сущность

В `entities/` живёт всё, что:

- имеет **бизнес-смысл** в предметной области (User, Order, Project),
- хранит/изменяет **доменное состояние**,
- **переиспользуется** ≥ двумя страницами/виджетами/фичами.

Что **не** entity:

- UI-компоненты (это `widgets/` или `shared/ui/`).
- Утилиты без бизнес-смысла (это `shared/lib/`).
- Cross-entity сценарии (это `processes/`).
- Локальное состояние одной страницы (это локальный composable в `pages/`).

---

## Шаги

Возьмём пример: добавляем сущность `Order`.

### 1. Создать структуру

```
src/entities/order/
├── schema/
│   └── order.schema.ts        ← Domain-схема (camelCase)
├── api/
│   ├── order.dto.ts           ← DTO-схема (контракт backend)
│   ├── order.mapper.ts        ← toOrder(dto): Order
│   └── index.ts               ← async-функции запросов
├── model/
│   └── order.store.ts
├── lib/                       ← опц.
└── index.ts                   ← публичный API
```

Создавай только нужные сегменты. Если у сущности нет UI — нет `ui/`. Если нет хелперов — нет `lib/`. Файлы `api/<x>.dto.ts` + `api/<x>.mapper.ts` обязательны для любой сущности с API ([ADR-0005](../adr/0005-dto-domain-mapping.md)).

### 2. Описать DTO-схему (контракт backend)

DTO — то, что приходит **снаружи**. Со всеми особенностями контракта (snake_case, форматы дат строками и т.п.). Тип `<X>Dto` **не выходит** за пределы `api/`-сегмента.

```ts
// src/entities/order/api/order.dto.ts
import { z } from 'zod'

export const orderStatusDtoSchema = z.enum(['draft', 'placed', 'paid', 'shipped', 'cancelled'])

export const orderDtoSchema = z.object({
  id: z.uuid(),
  customer_id: z.uuid(),
  total: z.number().nonnegative(),
  currency: z.string().length(3),
  status: orderStatusDtoSchema,
  created_at: z.coerce.date(),
})

export type OrderDto = z.infer<typeof orderDtoSchema>
```

Если контракт уже в camelCase — DTO-схема всё равно создаётся (декларация: «здесь граница, здесь конвертируется контракт»).

### 3. Описать Domain-схему (то, с чем работает приложение)

Schema-first для типов ([ADR-0003](../adr/0003-zod-as-source-of-truth.md)). Domain — всегда camelCase, «правильные» типы.

```ts
// src/entities/order/schema/order.schema.ts
import { z } from 'zod'

export const orderStatusSchema = z.enum(['draft', 'placed', 'paid', 'shipped', 'cancelled'])

export const orderSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  total: z.number().nonnegative(),
  currency: z.string().length(3),
  status: orderStatusSchema,
  createdAt: z.date(),
})

export type Order = z.infer<typeof orderSchema>
export type OrderStatus = z.infer<typeof orderStatusSchema>
```

**Не объявляй параллельный `interface Order`.** Только `z.infer`.

### 4. Mapper DTO → Domain

Чистая функция, единственная точка преобразования. Tривиальный mapper тоже создаётся — пусть будет.

```ts
// src/entities/order/api/order.mapper.ts
import type { OrderDto } from './order.dto'
import type { Order } from '../schema/order.schema'

export function toOrder(dto: OrderDto): Order {
  return {
    id: dto.id,
    customerId: dto.customer_id,
    total: dto.total,
    currency: dto.currency,
    status: dto.status,
    createdAt: dto.created_at,
  }
}
```

Обратный mapper (`fromOrder(model): OrderDto`) — создавай только когда нужен (PUT/POST). Не делай «на будущее».

### 5. API с валидацией ответа

```ts
// src/entities/order/api/index.ts
import { orderDtoSchema } from './order.dto'
import { toOrder } from './order.mapper'
import type { Order } from '../schema/order.schema'

export async function getOrder(id: string): Promise<Order> {
  // TODO: заменить на shared/api/http-client (ROADMAP, Фаза 1)
  const raw = await fetch(`/api/orders/${id}`).then((r) => r.json())

  const parsed = orderDtoSchema.safeParse(raw)
  if (!parsed.success) return Promise.reject(parsed.error)
  return toOrder(parsed.data)
}
```

Любой ответ от backend **обязан** пройти `safeParse` через DTO-схему и затем через mapper. UI и сторы получают только `Order` — `OrderDto` **наружу не уходит**.

### 6. Стор (setup-style)

[ADR-0002](../adr/0002-pinia-setup-stores.md).

```ts
// src/entities/order/model/order.store.ts
import { getOrder } from '../api'
import type { Order } from '../schema/order.schema'

export const useOrderStore = defineStore('order', () => {
  // state
  const current = ref<Order | null>(null)

  // getters
  const isPaid = computed(() => current.value?.status === 'paid')

  // actions
  async function fetchById(id: string) {
    current.value = await getOrder(id)
  }

  function reset() {
    current.value = null
  }

  return { current, isPaid, fetchById, reset }
})
```

**Не забудь `return`!** Setup без `return` = пустой стор (типичная ошибка composition-style, обсуждается в [ADR-0002](../adr/0002-pinia-setup-stores.md) § Consequences).

`defineStore`, `ref`, `computed` — авто-импортируются ([../reference/auto-imports.md](../reference/auto-imports.md)).

### 7. Lib — чистые функции (опц.)

```ts
// src/entities/order/lib/format-order-number.ts
import type { Order } from '../schema/order.schema'

export function formatOrderNumber(order: Order): string {
  return `#${order.id.slice(0, 8).toUpperCase()}`
}
```

Чистые функции без side effects. Если функции нужен Pinia-стор — это **не** lib, это часть model.

### 8. Публичный API

```ts
// src/entities/order/index.ts
export { useOrderStore } from './model/order.store'
export { formatOrderNumber } from './lib/format-order-number'
export { orderSchema, orderStatusSchema } from './schema/order.schema'
export type { Order, OrderStatus } from './schema/order.schema'
```

Экспортируй **только то, что нужно снаружи**. Внутренности слайса (DTO-схемы, mapper, API-функции, утилиты) — приватны. `OrderDto` снаружи не виден.

### 9. Использовать в коде

```ts
// в widget / page / feature
import { useOrderStore, formatOrderNumber, type Order } from '@/entities/order'
```

Запрещено:

```ts
// ❌ обход barrel
import { useOrderStore } from '@/entities/order/model/order.store'
```

---

## Чек-лист

- [ ] DTO-схема в `api/<x>.dto.ts`, тип `<X>Dto` через `z.infer`.
- [ ] Domain-схема в `schema/<x>.schema.ts`, тип `<X>` через `z.infer`, всегда camelCase.
- [ ] Mapper `to<X>(dto)` в `api/<x>.mapper.ts` — чистая функция.
- [ ] API использует `safeParse` через DTO-схему и mapper для всех ответов backend.
- [ ] DTO-тип **не** экспортируется из `index.ts` слайса.
- [ ] Стор в `model/`, setup-style, **есть `return`**.
- [ ] Lib — только чистые функции.
- [ ] `index.ts` экспортирует только публичную часть.
- [ ] Слайс не импортирует из соседних `entities/` или верхних слоёв.
- [ ] `npm run type-check && npm run lint` — без ошибок.

---

## Анти-паттерны

| ❌ Плохо | ✅ Хорошо |
|---------|----------|
| `interface Order { ... }` параллельно со схемой | `type Order = z.infer<typeof orderSchema>` |
| Одна схема описывает и контракт, и domain (snake_case в `user.value.is_active`) | DTO-схема + Domain-схема + mapper |
| API возвращает `any`, без `safeParse` | Все ответы валидируются через DTO-схему |
| `OrderDto` экспортируется из `index.ts` и попадает в стор | DTO живёт в `api/`, наружу выходит только `Order` |
| Стор без `return` | Setup-функция явно возвращает state/actions |
| Импорт из `entities/order/model/...` | Импорт из `@/entities/order` |
| Стор `order` импортирует стор `user` напрямую | Cross-entity логика в `processes/` или `features/` |
| Pinia-стор для локального state одной страницы | Composable в `pages/<page>/model/` |

---

## См. также

- [add-page.md](add-page.md) — как использовать сущность на странице
- [../architecture.md](../architecture.md) — слои и сегменты
- [../adr/0001-feature-sliced-design.md](../adr/0001-feature-sliced-design.md) — про FSD
- [../adr/0003-zod-as-source-of-truth.md](../adr/0003-zod-as-source-of-truth.md) — про Zod
- [../adr/0005-dto-domain-mapping.md](../adr/0005-dto-domain-mapping.md) — про разделение DTO/Domain/Mapper
