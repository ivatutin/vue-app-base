# Архитектура `vue-app-base`

Цель документа — дать инженеру **достаточный** контекст, чтобы за час понять, как устроен проект, и не нарушить конвенции в первом же PR. Это **explanation**: тут «почему» и «как устроено», а не пошаговые рецепты (для них — [how-to/](how-to/)).

---

## Стек и принципы

| Слой | Технология | Документация |
|------|-----------|--------------|
| Каркас | Vue 3.5 (Composition API, `<script setup>`) | [vuejs.org](https://vuejs.org) |
| UI | Vuetify 3.10 + Material Design Icons + Roboto | [vuetifyjs.com](https://vuetifyjs.com) |
| State | Pinia 3 (setup-stores) | [pinia.vuejs.org](https://pinia.vuejs.org) |
| Routing | vue-router 4 + `unplugin-vue-router` | [router.vuejs.org](https://router.vuejs.org) |
| Layouts | `vite-plugin-vue-layouts-next` | |
| Валидация / типы | Zod 4 (источник истины для типов) | [zod.dev](https://zod.dev) |
| Сборка | Vite 7 + TypeScript 5.9 + `vue-tsc` | |
| DX | `unplugin-auto-import`, `unplugin-vue-components` | |

Псевдоним `@/` → `src/` ([tsconfig.app.json:11](../tsconfig.app.json#L11), [vite.config.mts:110-112](../vite.config.mts#L110-L112)).

### Главные принципы

1. **Feature-Sliced Design** для организации кода ([ADR-0001](adr/0001-feature-sliced-design.md)).
2. **Public API через `index.ts`** — каждый слайс отдаёт наружу только то, что нужно.
3. **Schema-first типизация** — типы выводятся из Zod-схем ([ADR-0003](adr/0003-zod-as-source-of-truth.md)).
4. **Setup-stores Pinia** — composition-style для всех сторов ([ADR-0002](adr/0002-pinia-setup-stores.md)).
5. **Auto-imports** — Vue/Pinia/vue-router глобально доступны.

---

## FSD-слои

Слои внутри [src/](../src/) сверху вниз. **Каждый слой может импортировать только из нижних**:

```
app/        ←  главный слой: composition root, провайдеры, лэйауты
processes/  ←  длительные многошаговые сценарии (bootstrap, auth-flow, ...)
pages/      ←  маршрутные страницы
widgets/    ←  самостоятельные UI-блоки (sidebar, header, footer, ...)
features/   ←  пользовательские сценарии (зарезервирован, пока пуст)
entities/   ←  бизнес-сущности (user, auth, bootstrap)
shared/     ←  переиспользуемая инфраструктура (utils, ui, схемы)
```

Назначение каждого слоя:

| Слой | Что лежит | Что **не** лежит |
|------|-----------|------------------|
| `shared/` | Чистые утилиты, базовые UI-примитивы, общие Zod-схемы (Phone), HTTP-клиент (когда появится) | Бизнес-логика |
| `entities/` | Бизнес-сущности: схемы, сторы, API-доступ, RBAC-хелперы | UI-композиции, layout |
| `features/` | Пользовательские сценарии: «логин по email», «фильтр таблицы», «оплата» | Сущности |
| `widgets/` | Готовые блоки лэйаута: AppHeader, AppSidebar, AppNotifications | Доменная логика |
| `pages/` | Страницы маршрутов | Реиспользуемая логика (выносится в features/widgets) |
| `processes/` | Cross-entity сценарии: app-bootstrap, auth-flow, session-refresh | Простая логика, помещающаяся в один стор |
| `app/` | Точка входа, провайдеры (Pinia, Vuetify, Router), layouts, `App.vue` | Бизнес-код |

### Запрещённые направления импортов

```
✅ entities/user      → shared/lib/utils
✅ widgets/app-header → entities/user
✅ processes/auth     → entities/auth + entities/user
✅ pages/users        → widgets/user-table + entities/user

❌ entities/user      → entities/auth        (соседи на одном слое)
❌ entities/user      → widgets/app-header   (нижний → верхний)
❌ shared/lib         → entities/user        (фундамент → бизнес)
```

Защищается автоматом в будущем — `eslint-plugin-boundaries` в Фазе 2 [ROADMAP](../ROADMAP.md).

---

## Сегментная конвенция

Внутри слайса (`entities/user/`, `widgets/app-sidebar/`, ...) используются стандартные сегменты:

```
entities/user/
├── ui/        ← Vue-компоненты
├── model/     ← сторы, типы, бизнес-логика
├── api/       ← запросы к backend
├── lib/       ← чистые функции, хелперы
├── schema/    ← Zod-схемы и выводимые типы
└── index.ts   ← публичный API (barrel)
```

Создавай только нужные сегменты. Например, [src/entities/bootstrap/](../src/entities/bootstrap/) имеет только `bootstrap.store.ts`, потому что больше ничего не требуется.

### Public API через `index.ts`

```ts
// src/entities/user/index.ts
export { useUserStore } from './model/user.store'
export { can } from './lib/can'
export type { User } from './schema/user.schema'
```

```ts
// ✅ потребление слайса
import { useUserStore, can, type User } from '@/entities/user'

// ❌ обход barrel
import { useUserStore } from '@/entities/user/model/user.store'
```

Внутренняя структура слайса может меняться без оповещения мира. Меняется только `index.ts` — это контракт.

---

## Bootstrap-поток

Главная архитектурная особенность приложения — **splash-first монтирование**: UI отрисовывается **до** того, как закончится инициализация. Это даёт мгновенную обратную связь пользователю даже на медленном backend.

Реализация в [src/app/main.ts](../src/app/main.ts):

```ts
async function bootstrapApplication() {
  const app = createApp(App)
  const { router } = setupProviders(app)
  app.mount('#app')                        // 1. UI на экране
  await runBootstrapProcess({ router })    // 2. Только потом — async init
}
```

В этот момент [src/app/App.vue](../src/app/App.vue) показывает `<AppPreloader/>`, потому что `useBootstrapStore().isReady === false`. Когда `runBootstrapProcess` ставит статус `ready`, рендерится `<v-app>` с `<router-view/>`.

Состояние bootstrap — конечный автомат:

```
idle  →  initializing  →  ready
                       ↘  failed
```

Реализация в [src/entities/bootstrap/bootstrap.store.ts](../src/entities/bootstrap/bootstrap.store.ts) — это FSM с actions `start/finish/fail/reset`.

**Важно:** оркестрация (`processes/app-bootstrap`) и состояние (`entities/bootstrap`) **разделены**. Это каноническое FSD-решение. Многие проекты сливают это в один файл — у нас не так.

Полная sequence-диаграмма потока — [diagrams/bootstrap-flow.md](diagrams/bootstrap-flow.md).

---

## Routing

Маршруты — **file-based**, генерируются `unplugin-vue-router` из [src/pages/](../src/pages/).

### Кастомный path-resolver

В [vite.config.mts:18-46](../vite.config.mts#L18-L46) задан резолвер, который сворачивает FSD-структуру в URL:

```
src/pages/<group>/ui/<Name>Page.vue   →   /<group>
src/pages/<flat-file>.vue             →   /<flat-file>
```

Это позволяет странице быть **полноценным слайсом** со своими сегментами (`ui/`, `model/`, `api/`, ...), а не плоским файлом. Пример:

```
src/pages/dashboard/ui/DashboardPage.vue   →   /dashboard
src/pages/auth/login/ui/LoginPage.vue      →   /auth/login
src/pages/ui-kit/buttons.vue               →   /ui-kit/buttons
```

### Meta через `definePage`

Inside страницы meta задаётся через макрос (auto-imported):

```vue
<script setup lang="ts">
definePage({
  meta: {
    title: 'Dashboard',
    noAuth: true,           // не требует аутентификации
    permissions: ['user.read'],  // ⚠ проверка пока не реализована, см. ROADMAP
  },
})
</script>
```

Типы маршрутов генерируются в [src/typed-router.d.ts](../src/typed-router.d.ts) — это закоммиченный файл, **не редактируется руками**.

### Auth-guard

[src/app/providers/setup-router.ts:34-38](../src/app/providers/setup-router.ts#L34-L38) — whitelist-guard по `meta.noAuth`:

```ts
router.beforeEach((to) => {
  if (!to.meta.noAuth && !isAuthorized.value) return { name: '/auth/login' }
})
```

> ⚠️ Текущая реализация guard'а содержит ошибку — см. [KNOWN-ISSUES.md](../KNOWN-ISSUES.md), пункт 5.

### Layouts

Подключает `vite-plugin-vue-layouts-next`, читая [src/app/layouts/](../src/app/layouts/). Текущий единственный layout — `default.vue` (sidebar + header + `<router-view/>` + footer).

Указать другой layout: `definePage({ meta: { layout: 'auth' } })`. Сейчас существует только `default`; `auth` — в [ROADMAP](../ROADMAP.md), Фаза 1.

---

## State management

### Pinia setup-stores

Все сторы — в composition-style ([ADR-0002](adr/0002-pinia-setup-stores.md)):

```ts
export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isAuthorized = computed(() => user.value?.isActive ?? false)

  async function fetchCurrentUser() {
    user.value = await getCurrentUser()
  }

  return { user, isAuthorized, fetchCurrentUser }
})
```

Не Options API. Не классы. Доступные глобально без `import`: `defineStore`, `storeToRefs`.

### Schema-first типы

[src/entities/user/schema/user.schema.ts](../src/entities/user/schema/user.schema.ts) — Zod-схема, из неё выводится TS-тип:

```ts
export const userSchema = z.object({ /* ... */ })
export type User = z.infer<typeof userSchema>
```

Параллельный `interface User { ... }` **запрещён** — только `z.infer`. Подробнее — [ADR-0003](adr/0003-zod-as-source-of-truth.md).

### Валидация ответов API

Любой ответ от backend проходит через `safeParse` ещё до попадания в стор:

```ts
// src/entities/user/api/index.ts
const res = userSchema.safeParse(rawResponse)
if (!res.success) return Promise.reject(res.error)
return Promise.resolve(res.data)
```

Это защита от грязного контракта: если backend сломает поле, фронт упадёт **в одном месте** с понятной ошибкой, а не размажет undefined по UI.

### Brand-types

Для значений с дополнительной семантикой (валидированный телефон, ID сущности) используется `.brand<...>()`:

```ts
// src/shared/model/phone/phone.schema.ts
export const phoneSchema = z.string().trim()
  .transform(normalizePhone)
  .refine((v) => E164_REGEX.test(v))
  .brand<'Phone'>()

export type Phone = z.infer<typeof phoneSchema>
```

Функция, принимающая `Phone`, больше не примет произвольную строку — нужно явно провалидировать.

---

## RBAC

Модель прав живёт в [src/entities/user/](../src/entities/user/):

- **Роли** — `roles: string[]` в схеме пользователя.
- **Разрешения** — `permissions: PermissionCode[]`, где `PermissionCode` — `z.enum` с фиксированным списком.
- **Проверка** — функция `can(permission)` из [src/entities/user/lib/can.ts](../src/entities/user/lib/can.ts).

UI-фильтрация — пример в [src/widgets/app-sidebar/ui/AppSidebar.vue](../src/widgets/app-sidebar/ui/AppSidebar.vue):

```ts
const visibleItems = computed(() =>
  sidebarItems.filter((item) => !item.permission || can(item.permission)),
)
```

> ⚠️ Проверка `meta.permissions` в guard'е **ещё не реализована** — её надо добавить, иначе по прямой ссылке можно попасть на запрещённый маршрут. См. [ROADMAP](../ROADMAP.md), Фаза 1.

> ⚠️ Файл `src/entities/permission/` упоминается в импортах, но не существует. См. [KNOWN-ISSUES.md](../KNOWN-ISSUES.md), пункты 2-3.

Декларативный вариант (`<Can permission="...">`) — в [ROADMAP](../ROADMAP.md), Фаза 2.

---

## Provider-pattern в `app/`

[src/app/providers/](../src/app/providers/) — каждое глобальное расширение Vue в своём setup-модуле:

```
providers/
├── index.ts              ← агрегатор: setupProviders(app)
├── setup-pinia.ts        ← createPinia + app.use
├── setup-router.ts       ← createRouter + guards
└── setup-vuetify.ts      ← createVuetify
```

Добавляешь новую инфраструктуру (i18n, sentry, error-handler) — создаёшь `setup-<name>.ts` и подключаешь в `index.ts`. Это **composition root**: все зависимости собираются ровно здесь.

---

## Auto-imports

Включены в [vite.config.mts:56-69](../vite.config.mts#L56-L69) (`unplugin-auto-import`). Подробный список — [reference/auto-imports.md](reference/auto-imports.md).

Кратко:

- Vue Composition API — `ref`, `computed`, `watch`, `onMounted`, `useTemplateRef`, …
- vue-router — `useRoute`, `useRouter`, `definePage`, `useRouterEnter`, …
- Pinia — `defineStore`, `storeToRefs`

Генерируется `src/auto-imports.d.ts` (закоммичено, не редактировать).

**Что НЕ авто-импортируется:** компоненты из `widgets/` и `shared/ui/`. Их импортировать **только через barrel `index.ts`**:

```vue
<script setup lang="ts">
import { AppSidebar } from '@/widgets/app-sidebar'
import { CodeViewer } from '@/shared/ui/base/code-viewer'
</script>
```

Авто-сканирование компонентов настроено на `src/shared/components/` ([vite.config.mts:70-76](../vite.config.mts#L70-L76)).

---

## Environment

### `.env` файлы

[env.d.ts](../env.d.ts) объявляет типы для `import.meta.env.VITE_*`. Значения — в [.env](../.env). Полный список переменных и значений — [reference/env.md](reference/env.md).

### Дубль с `config.json`

В проекте параллельно существует [src/assets/config.json](../src/assets/config.json) с теми же ключами (`API_URL`, `WS_HOST`), что и в `.env`. Это **тех-долг** — см. [KNOWN-ISSUES.md](../KNOWN-ISSUES.md), раздел «Code quality».

Решение: схема валидации env через Zod (в [ROADMAP](../ROADMAP.md), Фаза 1) и единый источник.

---

## Дальше

- Делаешь страницу — [how-to/add-page.md](how-to/add-page.md).
- Делаешь сущность — [how-to/add-entity.md](how-to/add-entity.md).
- Хочешь понять «почему так» — [adr/](adr/).
- Видишь, что можно улучшить — пиши пункт в [ROADMAP](../ROADMAP.md).
