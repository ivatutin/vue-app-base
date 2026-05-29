# Архитектура `vue-app-base`

Цель документа — дать инженеру **достаточный** контекст, чтобы за час понять, как устроен проект, и не нарушить конвенции в первом же PR. Это **explanation**: тут «почему» и «как устроено», а не пошаговые рецепты (для них — [how-to/](how-to/)).

---

## Стек и принципы

| Слой | Технология | Документация |
|------|-----------|--------------|
| Каркас | Vue 3.5 (Composition API, `<script setup>`) | [vuejs.org](https://vuejs.org) |
| UI (обёртки `shared/ui/base/`) | shadcn-vue + reka-ui + Tailwind v4 + @lucide/vue + design tokens | [shadcn-vue.com](https://www.shadcn-vue.com/) / [ADR-0007](adr/0007-ui-stack-migration-from-vuetify.md) |
| UI (shell) | Vuetify 3.10 + MDI + Roboto — пока в `app/layouts/*` и `widgets/app-{header,sidebar,footer}` (переезд в Фазе 2.8) | [vuetifyjs.com](https://vuetifyjs.com) |
| State | Pinia 3 (setup-stores) | [pinia.vuejs.org](https://pinia.vuejs.org) |
| Routing | vue-router 4 + `unplugin-vue-router` | [router.vuejs.org](https://router.vuejs.org) |
| Layouts | `vite-plugin-vue-layouts-next` | |
| Валидация / типы | Zod 4 (источник истины для типов) | [zod.dev](https://zod.dev) |
| Сборка | Vite 7 + TypeScript 5.9 + `vue-tsc` | |
| DX | `unplugin-auto-import`, `unplugin-vue-components`, `@vueuse/core` | |

Псевдоним `@/` → `src/` ([tsconfig.app.json:11](../tsconfig.app.json#L11), [vite.config.mts:108-111](../vite.config.mts#L108-L111)).

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
entities/   ←  бизнес-сущности (user, auth, bootstrap, notification)
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
| `processes/` | Cross-entity сценарии: app-bootstrap (FSM-инициализация), auth-flow (loginFlow, logoutFlow) | Простая логика, помещающаяся в один стор |
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
    noAuth: true,                // не требует аутентификации
    permissions: ['user.read'],  // требуемые permissions, проверка в guard
    layout: 'auth',              // альтернативный layout (см. § Layouts)
  },
})
</script>
```

Типы маршрутов генерируются в [src/typed-router.d.ts](../src/typed-router.d.ts) — это закоммиченный файл, **не редактируется руками**. Поля `meta` (`title`, `noAuth`, `permissions`) типизированы через [src/router-meta.d.ts](../src/router-meta.d.ts) (extend `RouteMeta`).

### Auth-guard

[src/app/providers/setup-router.ts](../src/app/providers/setup-router.ts) — `router.beforeEach`:

```ts
router.beforeEach((to) => {
  const userStore = useUserStore()
  const { isAuthorized } = storeToRefs(userStore)
  if (!to.meta.noAuth && !isAuthorized.value) return { name: '/auth/login' }
  if (to.meta.permissions?.length && !to.meta.permissions.every(userStore.hasPermission)) {
    return { name: '/system/forbidden' }
  }
})
```

`useUserStore()` вызывается **внутри** `beforeEach` (не на верхнем уровне `setupRouter`), `storeToRefs` сохраняет реактивность state — стор может быть пустым на момент регистрации guard'а и наполниться bootstrap'ом до первого реального перехода. `hasPermission` — метод, безопасно деструктурировать без `storeToRefs`.

### Layouts

Подключает `vite-plugin-vue-layouts-next`, читая [src/app/layouts/](../src/app/layouts/). Доступны два layout'а:

- **`default.vue`** — sidebar + header + `<router-view/>` + footer + `<AppNotifications/>`. Используется для всех страниц по умолчанию.
- **`auth.vue`** — центрированная карточка без навигации + `<AppNotifications/>`. Подключается через `definePage({ meta: { layout: 'auth' } })` (login/logout страницы).

Указать другой layout: `definePage({ meta: { layout: 'auth' } })`. Сейчас существует только `default`; `auth` — в [ROADMAP](../ROADMAP.md), Фаза 1.

---

## State management

### Pinia setup-stores

Все сторы — в composition-style ([ADR-0002](adr/0002-pinia-setup-stores.md)):

```ts
export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isAuthorized = computed(() => user.value !== null && user.value.status === 'active')

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

### Валидация ответов API + разделение DTO ↔ Domain

Контракт backend и domain-модель **разделены** ([ADR-0005](adr/0005-dto-domain-mapping.md)). Для каждой сущности с API — три файла:

```
entities/<x>/
├── api/
│   ├── <x>.dto.ts      ← Zod-схема DTO: контракт backend «как есть» (snake_case, если backend snake_case)
│   ├── <x>.mapper.ts   ← to<X>(dto): <X>  — единственная точка преобразования
│   └── index.ts        ← async-функции запросов, возвращают Domain
└── schema/
    └── <x>.schema.ts   ← Zod-схема Domain: всегда camelCase, «правильные» типы
```

API-функция парсит raw-ответ через DTO-схему, гонит через mapper, возвращает Domain. **DTO дальше `api/`-сегмента не выходит** — сторы, UI, composables оперируют только Domain.

```ts
// src/entities/user/api/index.ts
const parsed = userDtoSchema.safeParse(rawResponse)
if (!parsed.success) return Promise.reject(parsed.error)
return toUser(parsed.data)
```

Это защита от грязного контракта (баг в одном понятном месте) плюс изоляция UI от изменений backend (правка поля backend → правка mapper, остальной код не трогается).

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

Модель прав разнесена по двум слоям ([ADR-0004](adr/0004-rbac-vocabulary-in-shared.md)):

- **Vocabulary прав** — `permissionSchema` (`z.enum` с фиксированным списком) и тип `PermissionCode` — живёт в [src/shared/model/permission/](../src/shared/model/permission/). Это словарное знание без бизнес-поведения, доступное любому слою (sidebar, guard, формы).
- **Бизнес-логика проверки** — функция `can(permission)` — в [src/entities/user/lib/can.ts](../src/entities/user/lib/can.ts). Завязана на `useUserStore()`, поэтому не может жить ниже `entities/user/`.
- **Роли пользователя** — `roles: string[]` в схеме `User`. Backend (`njs-server`) отдаёт только roles, без permissions.
- **Permissions — frontend-абстракция.** Считаются из ролей через `rolesToPermissions(roles)` (`shared/model/permission/role-permissions.ts`). `userStore.permissions` — computed-проекция. Расширение таблицы — добавление новой роли в `ROLE_PERMISSIONS`.

UI-фильтрация — пример в [src/widgets/app-sidebar/ui/AppSidebar.vue](../src/widgets/app-sidebar/ui/AppSidebar.vue):

```ts
const visibleItems = computed(() =>
  sidebarItems.filter((item) => !item.permission || can(item.permission)),
)
```

Защита маршрутов — [src/app/providers/setup-router.ts](../src/app/providers/setup-router.ts):

```ts
router.beforeEach((to) => {
  const userStore = useUserStore()
  const { isAuthorized } = storeToRefs(userStore)
  if (!to.meta.noAuth && !isAuthorized.value) return { name: '/auth/login' }
  if (to.meta.permissions?.length && !to.meta.permissions.every(userStore.hasPermission)) {
    return { name: '/system/forbidden' }
  }
})
```

`meta.permissions: PermissionCode[]` типизирован в [src/router-meta.d.ts](../src/router-meta.d.ts) (extend `RouteMeta`).

Декларативный вариант (`<Can permission="...">`) — в [ROADMAP](../ROADMAP.md), Фаза 2.

---

## HTTP-клиент

[src/shared/api/](../src/shared/api/) содержит `class HttpClient` + `HttpError` + singleton-инстанс. Архитектура зафиксирована в [ADR-0006](adr/0006-fetch-based-http-client.md): fetch-обёртка с DI auth-interceptor и refresh-mutex.

Использование из API-функций сущностей:

```ts
// src/entities/<x>/api/index.ts
import { getHttpClient } from '@/shared/api'

export async function getX(): Promise<X> {
  const client = getHttpClient()
  const dto = await client.get<unknown>('/x')
  // ... safeParse + mapper согласно ADR-0005
}
```

Ключевые свойства:

- **Bearer JWT** добавляется автоматически из `getAccessToken()`-коллбэка, если установлен токен и `RequestOptions.auth !== false`.
- **401 → refresh → retry** — single-flight: одновременные 401 ждут один и тот же refresh-вызов, повторяются ровно один раз.
- **HttpError** — типизированный класс ошибки со `status`, `statusText`, `errorName`, `message`, `details` (формат бэка `njs-server`, см. [integration-backend.md](integration-backend.md) § Формат ошибок).
- **Public endpoints** — передавать `{ auth: false }` (sign-in, refresh не нуждаются в access-token).

Инстанс собирается в [src/app/providers/setup-http-client.ts](../src/app/providers/setup-http-client.ts), который связывает клиент с `useAuthStore()` (`getAccessToken` и `onUnauthorized → auth.refresh()`). Порядок провайдеров: pinia → http-client → error-handler → vuetify → router.

---

## Error handling

Глобальный отлов — [src/app/providers/setup-error-handler.ts](../src/app/providers/setup-error-handler.ts):

- `app.config.errorHandler` — Vue-ошибки в шаблонах/setup.
- `window.unhandledrejection` — необработанные promise-rejection (типичный кейс — async-вызовы из template без try/catch).
- `window.error` — runtime-ошибки.

Все три события идут в `report(err, source)` → `console.error` + `useNotificationStore().notifyError(humanize(err))`. `humanize` для `HttpError` берёт `message` (от бэка), для `Error` — `message`, иначе `'Что-то пошло не так'`.

Notification-store — [src/entities/notification](../src/entities/notification/): простой setup-store с очередью. Default-timeout по kind (info/success — 4s, warning — 6s, error — sticky). Хост — [src/widgets/app-notifications/](../src/widgets/app-notifications/), `<v-snackbar>` стек, подключён в оба layout'а.

Дополнительно: ошибки внутри **бизнес-flow** (например, login form) ловятся **локально** через `try/catch` и показываются inline (например, `v-alert`). Глобальный handler нужен для не-обработанного: программных багов, выпавших promise'ов.

---

## Environment

Конфигурация рантайма читается из `import.meta.env.VITE_*` (объявлено в [env.d.ts](../env.d.ts), значения в [.env](../.env)). Валидация — Zod-схема в [src/shared/config/env.ts](../src/shared/config/env.ts), парсится при первом импорте, бросает Error со списком issues если что-то не так. Прямой `import.meta.env.VITE_*` использовать только внутри `shared/config/env.ts`; в коде — `env.VITE_API_URL`.

Полный список переменных и порядок добавления — [reference/env.md](reference/env.md).

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

## Backend

Контракт API живёт отдельно — см. [integration-backend.md](integration-backend.md). Кратко: NestJS на `http://localhost:3001/api/v1`, Bearer JWT через `Authorization` header, refresh через `POST /auth/refresh`. CORS на бэке не настроен, в dev фронт идёт через [Vite proxy](#environment) (`'/api'` → `localhost:3001`).

---

## Дальше

- Делаешь страницу — [how-to/add-page.md](how-to/add-page.md).
- Делаешь сущность — [how-to/add-entity.md](how-to/add-entity.md).
- Хочешь понять «почему так» — [adr/](adr/).
- Видишь, что можно улучшить — пиши пункт в [ROADMAP](../ROADMAP.md).
