# Known Issues

Реестр известных багов и тех-долга. Дата ревью: **2026-05-22**.

Уровни:
- **P0** — ломает функциональность, фиксить срочно.
- **P1** — мешает работе или вводит в заблуждение, фиксить в первой итерации.
- **P2** — мелочи, фиксить попутно.

Каждый пункт ссылается на конкретное место в коде. План устранения — в [ROADMAP.md](ROADMAP.md), Фаза 0.

---

## P0 — Критические

### 1. Несоответствие схемы `User` и стора → `isAuthorized` всегда `false`

**Файлы:**
- [src/entities/user/schema/user.schema.ts:18](src/entities/user/schema/user.schema.ts#L18)
- [src/entities/user/model/user.store.ts:14](src/entities/user/model/user.store.ts#L14)

**Что:** в схеме поле `is_active` (snake_case), в сторе обращение `user.value.isActive` (camelCase). То же с `full_name`/`created_at`.

**Симптом:** `isAuthorized` всегда `undefined → false` → любой авторизованный пользователь воспринимается как неавторизованный → бесконечный редирект на `/auth/login`.

**Почему TS молчит:** `User` выводится из `z.infer<typeof userSchema>`, но обращение к несуществующему полю отдаёт `any` через структурный вывод. Под `strict: true` без `noUncheckedIndexedAccess` это допустимо.

**Чинить:** перейти на camelCase в схеме целиком (см. ADR-кандидат «DTO ↔ Domain mapping» в [ROADMAP.md](ROADMAP.md)).

### 2. Сломанный импорт `entities/user/lib/can.ts`

**Файл:** [src/entities/user/lib/can.ts:3](src/entities/user/lib/can.ts#L3)

**Что:** `import type { PermissionCode } from '../model/types'` — файла `model/types.ts` нет.

**Симптом:** type-only импорт компилируется (TS вычёркивает несуществующие type-only при `verbatimModuleSyntax: false`), но `PermissionCode` фактически `any`.

**Чинить:** создать `entities/permission/` (см. п.3) либо экспортировать `PermissionCode` из `entities/user/schema/user.schema.ts`.

### 3. Сломанный импорт `widgets/app-sidebar/model/sidebar-items.ts`

**Файл:** [src/widgets/app-sidebar/model/sidebar-items.ts:1](src/widgets/app-sidebar/model/sidebar-items.ts#L1)

**Что:** `import type { PermissionCode } from "@/entities/permission"` — слайса `entities/permission` нет.

**Симптом:** аналогично п.2.

**Чинить:** создать `entities/permission/`.

### 4. `entities/auth/auth.store.ts` — setup-функция без `return`

**Файл:** [src/entities/auth/model/auth.store.ts](src/entities/auth/model/auth.store.ts)

**Что:**
- `defineStore('auth', () => { ... })` без `return` → стор фактически пустой.
- Опечатка в аргументе `login(emaiil_or_phone, ...)`.
- `isLoaded` названо неверно — это loading-флаг (правильно `isLoading`).
- `try/catch` пустые, ничего не делают.
- [src/entities/auth/index.ts](src/entities/auth/index.ts) пустой → нет публичного API.

**Симптом:** `useAuthStore()` возвращает `undefined`, любая попытка использовать стор падает.

**Чинить:** вернуть state/getters/actions из setup, заполнить `index.ts`, реализовать минимальную логику `login/logout/refresh` с использованием `tokenStorage`.

### 5. Auth-guard ломает реактивность и работает на пустом сторе

**Файл:** [src/app/providers/setup-router.ts:17,34-38](src/app/providers/setup-router.ts#L17)

**Что:**
1. `const { user, isAuthorized } = useUserStore()` вызван на верхнем уровне `setupRouter` — **до** монтирования и до bootstrap. В этот момент стор только что создан, пустой.
2. Деструктуризация Pinia-стора сама по себе срывает реактивность для state-полей (для computed работает, но это исключение, а не правило).

**Симптом:** любой переход без `meta.noAuth` редиректит на login — даже при наличии валидного токена.

**Чинить:** вызывать `useUserStore()` **внутри** `router.beforeEach`, использовать `storeToRefs`. До запуска guard'а должен отработать `user.fetchCurrentUser()` из bootstrap.

---

## P1 — Существенные

### 6. Bootstrap — заглушка `sleep(3000)`

**Файл:** [src/processes/app-bootstrap/bootstrap.process.ts:20](src/processes/app-bootstrap/bootstrap.process.ts#L20)

**Что:** реальная инициализация не выполняется, нет восстановления сессии. `config.loadConfig()` и `auth.init()` закомментированы.

**Чинить:** заменить на pipeline `env-валидация → auth.init() → user.fetchCurrentUser()` (после фиксов п.1, п.4).

### 7. `pages/systesm/` — опечатка в имени директории

**Файлы:** [src/pages/systesm/](src/pages/systesm/), [src/typed-router.d.ts](src/typed-router.d.ts)

**Чинить:** переименовать в `pages/system/`, обновить ссылки в [src/widgets/app-footer/ui/AppFooter.vue](src/widgets/app-footer/ui/AppFooter.vue), перегенерировать `typed-router.d.ts`.

### 8. Хак с `route.meta.title.value = ...` в Dashboard

**Файл:** [src/pages/dashboard/ui/DashboardPage.vue:13-21](src/pages/dashboard/ui/DashboardPage.vue#L13-L21)

**Что:** title мутируется через `setInterval` напрямую в `route.meta`, причём через `ref` внутри meta.

**Симптом:** ломается на SSR, плохо ведёт себя с историей маршрутов.

**Чинить:** перейти на composable `usePageMeta` (см. [ROADMAP.md](ROADMAP.md), Фаза 2).

### 9. Хранение токенов в `localStorage`

**Файл:** [src/entities/auth/lib/token-storage.ts](src/entities/auth/lib/token-storage.ts)

**Что:** токены в `localStorage`, имена ключей `__Secure_*` (имя не делает их secure).

**Симптом:** уязвимость к XSS.

**Чинить:** перейти на httpOnly-cookie со стороны backend; зафиксировать решение в ADR.

### 10. Отсутствие AuthLayout

**Файлы:** [src/pages/auth/login/ui/LoginPage.vue](src/pages/auth/login/ui/LoginPage.vue), [src/pages/auth/logout/ui/LogoutPage.vue](src/pages/auth/logout/ui/LogoutPage.vue)

**Что:** auth-страницы рендерятся внутри `default.vue` вместе с сайдбаром.

**Чинить:** создать `src/app/layouts/auth.vue` + `definePage({ meta: { layout: 'auth' } })`.

---

## P2 — Code quality

| Файл:строка | Проблема |
|-------------|----------|
| [src/app/providers/setup-router.ts:10](src/app/providers/setup-router.ts#L10) | `console.log('import.meta', import.meta)` в проде |
| [src/app/layouts/default.vue:8](src/app/layouts/default.vue#L8) | Отладочный текст `$route.meta - {{ $route.meta.title }}` в шаблоне |
| [src/app/layouts/default.vue:24-25](src/app/layouts/default.vue#L24-L25) | `console.log` в setup |
| [src/widgets/app-header/ui/AppHeader.vue:18-22](src/widgets/app-header/ui/AppHeader.vue#L18-L22) | Все 4 пункта меню вызывают `theme.toggle()` (copy-paste из «темная/светлая тема»); несуществующий атрибут `prepend-gap` |
| [src/widgets/app-footer/ui/AppFooter.vue:21](src/widgets/app-footer/ui/AppFooter.vue#L21) | `import { shallowRef }` дублирует auto-import |
| [src/widgets/app-preloader/ui/AppPreloader.vue:19](src/widgets/app-preloader/ui/AppPreloader.vue#L19) | `stroke="green"` игнорирует тему Vuetify |
| [src/pages/index.vue](src/pages/index.vue) | Главная — `HelloWorld` из Vuetify-стартера |
| [vite.config.mts:108](vite.config.mts#L108) | `define: { 'process.env': {} }` — устаревший workaround |
| [src/entities/user/api/index.ts:5](src/entities/user/api/index.ts#L5) | `console.log('getCurrentUser')` |
| Имена файлов | Где-то `<Name>Page.vue` (в `ui/`), где-то плоский `<name>.vue` (`buttons.vue`, `typography.vue`) — конвенция зафиксирована в [CONTRIBUTING.md](CONTRIBUTING.md), требует приведения существующих файлов |
| `src/assets/config.json` ↔ `.env` | Два источника конфигурации одних и тех же значений |

---

## Архитектурные пустоты (не баги, но фиксируем)

Не баги, но «отсутствующая инфраструктура» проявится на масштабе. Все вынесены в [ROADMAP.md](ROADMAP.md):

- Нет HTTP-клиента / interceptor'ов / обработки 401.
- Нет валидации env через Zod.
- Нет глобального `app.config.errorHandler`.
- Нет snackbar/notification-стора.
- Нет i18n (UI на русском, тексты вшиты в шаблоны).
- Нет тестов (Vitest, Playwright не настроены).
- Нет ESLint-boundaries для FSD-правил.
- Нет Husky/lint-staged/commitlint.
- Нет CI.

---

## Как пользоваться этим документом

- Берёшь пункт в работу → ставишь себе issue/PR, в нём фиксируешь `KNOWN-ISSUES.md#N`.
- Закрываешь баг → удаляешь пункт из этого файла.
- Если баг порождает архитектурное решение — пиши ADR в [docs/adr/](docs/adr/) до фикса.
