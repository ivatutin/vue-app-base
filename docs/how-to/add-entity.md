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
│   └── order.schema.ts        ← начни отсюда
├── api/
│   └── index.ts
├── model/
│   └── order.store.ts
├── lib/                       ← опц.
└── index.ts                   ← публичный API
```

Создавай только нужные сегменты. Если у сущности нет UI — нет `ui/`. Если нет хелперов — нет `lib/`.

### 2. Описать схему (Zod-first)

Схема — **источник истины** для типов ([ADR-0003](../adr/0003-zod-as-source-of-truth.md)).

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
  createdAt: z.coerce.date(),
})

export type Order = z.infer<typeof orderSchema>
export type OrderStatus = z.infer<typeof orderStatusSchema>
```

**Не объявляй параллельный `interface Order`.** Только `z.infer`.

### 3. API с валидацией ответа

```ts
// src/entities/order/api/index.ts
import { orderSchema } from '../schema/order.schema'
import type { Order } from '../schema/order.schema'

export async function getOrder(id: string): Promise<Order> {
  // TODO: заменить на shared/api/http-client (ROADMAP, Фаза 1)
  const raw = await fetch(`/api/orders/${id}`).then((r) => r.json())

  const parsed = orderSchema.safeParse(raw)
  if (!parsed.success) return Promise.reject(parsed.error)
  return parsed.data
}
```

Любой ответ от backend **обязан** пройти `safeParse`. Это контракт.

### 4. Стор (setup-style)

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

**Не забудь `return`!** Setup без `return` = пустой стор (типичный баг — см. [KNOWN-ISSUES.md](../../KNOWN-ISSUES.md), пункт 4).

`defineStore`, `ref`, `computed` — авто-импортируются ([../reference/auto-imports.md](../reference/auto-imports.md)).

### 5. Lib — чистые функции (опц.)

```ts
// src/entities/order/lib/format-order-number.ts
import type { Order } from '../schema/order.schema'

export function formatOrderNumber(order: Order): string {
  return `#${order.id.slice(0, 8).toUpperCase()}`
}
```

Чистые функции без side effects. Если функции нужен Pinia-стор — это **не** lib, это часть model.

### 6. Публичный API

```ts
// src/entities/order/index.ts
export { useOrderStore } from './model/order.store'
export { formatOrderNumber } from './lib/format-order-number'
export { orderSchema, orderStatusSchema } from './schema/order.schema'
export type { Order, OrderStatus } from './schema/order.schema'
```

Экспортируй **только то, что нужно снаружи**. Внутренности слайса (API-функции, утилиты) — приватны.

### 7. Использовать в коде

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

- [ ] Схема в `schema/`, тип через `z.infer`.
- [ ] API использует `safeParse` для всех ответов backend.
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
| API возвращает `any`, без `safeParse` | Все ответы валидируются Zod |
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
