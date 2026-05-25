# How-to: добавить страницу

Рецепт. Без объяснений «почему так» — для этого [../architecture.md](../architecture.md) § Routing.

## Два варианта

| Вариант | Когда |
|---------|-------|
| **FSD-слайс** (`pages/<group>/ui/<Name>Page.vue`) | Страница со своей логикой, API, model — нормальный случай |
| **Плоский файл** (`pages/<name>.vue`) | Страница без своей логики (демо, статика) |

Маршрут генерируется автоматически из имени файла. Кастомный path-resolver настроен в [vite.config.mts:18-46](../../vite.config.mts#L18-L46).

---

## Вариант A: FSD-слайс (рекомендуемый)

### 1. Создать структуру

```
src/pages/<group>/
├── ui/
│   └── <Name>Page.vue
├── model/        ← опц., если есть локальная логика
├── api/          ← опц., если страница дёргает свои endpoints
└── lib/          ← опц.
```

URL будет: `/<group>`. Пример: `src/pages/users/ui/UsersPage.vue` → `/users`.

### 2. Написать страницу

```vue
<!-- src/pages/users/ui/UsersPage.vue -->
<script setup lang="ts">
definePage({
  meta: {
    title: 'Пользователи',
    // noAuth: true,                  // если страница публичная
    // permissions: ['user.read'],    // см. ⚠ ниже
    // layout: 'auth',                // если не default layout (см. ⚠)
  },
})

// auto-imported: ref, computed, useRoute, useRouter, definePage, ...
</script>

<template>
  <div>
    <h1>Пользователи</h1>
    <!-- ... -->
  </div>
</template>
```

### 3. Запустить dev-сервер

```bash
npm run dev
```

`unplugin-vue-router` перегенерит маршруты и типы в [src/typed-router.d.ts](../../src/typed-router.d.ts). Перейди по URL — страница должна открыться.

---

## Вариант B: плоский файл

```vue
<!-- src/pages/help.vue → /help -->
<script setup lang="ts">
definePage({ meta: { title: 'Помощь', noAuth: true } })
</script>

<template>
  <div>Текст справки</div>
</template>
```

Используй, только когда у страницы реально нет model/api — например, демо-страницы в `ui-kit/`.

---

## Использование виджетов и сущностей

Импорт **только через barrel** (`index.ts`):

```vue
<script setup lang="ts">
import { useUserStore } from '@/entities/user'
import { CodeViewer } from '@/shared/ui/base/code-viewer'

const userStore = useUserStore()
</script>
```

Запрещено:

```ts
// ❌ обход barrel
import { useUserStore } from '@/entities/user/model/user.store'
```

См. [../../CONTRIBUTING.md](../../CONTRIBUTING.md) § «Правила импортов (FSD)».

---

## Meta-поля страницы

| Поле | Тип | Назначение |
|------|-----|------------|
| `title` | `string` | Заголовок (читается layout'ом) |
| `noAuth` | `boolean` | Страница доступна без аутентификации |
| `permissions` | `PermissionCode[]` | Требуемые разрешения, проверка в guard |
| `layout` | `'default' \| 'auth'` | Альтернативный layout |

**`permissions`** — guard зовёт `userStore.hasPermission(p)` для каждого; не хватает прав → редирект на `/system/forbidden`. Маппинг ролей в permissions — `shared/model/permission/role-permissions.ts`.

**`layout`** — Layout'ы лежат в [src/app/layouts/](../../src/app/layouts/). Доступны `default.vue` (с навигацией) и `auth.vue` (центрированная карточка без навигации).

---

## Доступ к route и navigation

Всё авто-импортировано (см. [../reference/auto-imports.md](../reference/auto-imports.md)):

```vue
<script setup lang="ts">
const route = useRoute()        // текущий route
const router = useRouter()      // навигация
const id = route.params.id      // типизировано через typed-router.d.ts

function goHome() {
  router.push({ name: '/' })    // имя маршрута, типизировано
}
</script>
```

Имена маршрутов берутся из [src/typed-router.d.ts](../../src/typed-router.d.ts).

---

## Чек-лист перед PR

- [ ] Маршрут открывается локально (`npm run dev`).
- [ ] `npm run type-check` без ошибок.
- [ ] `npm run lint` без ошибок.
- [ ] Импорты только через barrel.
- [ ] Если страница защищённая — `meta.noAuth` **не** установлен.
- [ ] Если есть locale-строки — на русском (i18n ещё не подключён, [ROADMAP](../../ROADMAP.md) Фаза 2).
- [ ] `console.log` удалены.

---

## См. также

- [add-entity.md](add-entity.md) — если странице нужна новая бизнес-сущность
- [../architecture.md § Routing](../architecture.md) — как устроен path-resolver
- [../reference/auto-imports.md](../reference/auto-imports.md) — что доступно без import
