# Reference: auto-imports

Настроено в [vite.config.mts:56-69](../../vite.config.mts#L56-L69) плагином `unplugin-auto-import`. Типы генерируются в [src/auto-imports.d.ts](../../src/auto-imports.d.ts) (закоммичено, **не редактируй руками**).

## Что доступно без `import`

### Vue Composition API

Полный набор из пакета `vue`:

| Категория | Функции |
|-----------|---------|
| Реактивность | `ref`, `shallowRef`, `computed`, `reactive`, `shallowReactive`, `readonly`, `toRef`, `toRefs`, `unref`, `isRef`, `isReactive` |
| Watchers | `watch`, `watchEffect`, `watchPostEffect`, `watchSyncEffect` |
| Lifecycle | `onMounted`, `onBeforeMount`, `onUnmounted`, `onBeforeUnmount`, `onUpdated`, `onBeforeUpdate`, `onActivated`, `onDeactivated`, `onErrorCaptured` |
| DI | `provide`, `inject` |
| Шаблоны | `useTemplateRef`, `defineComponent`, `defineEmits`, `defineProps`, `defineExpose`, `defineSlots`, `defineModel`, `defineOptions` |
| Прочее | `nextTick`, `getCurrentInstance`, `effectScope`, `markRaw`, `triggerRef` |

Полный список — [src/auto-imports.d.ts](../../src/auto-imports.d.ts).

### vue-router

Через `VueRouterAutoImports`:

- `useRoute`
- `useRouter`
- `useLink`
- `definePage` (макрос `unplugin-vue-router`)
- `onBeforeRouteUpdate`, `onBeforeRouteLeave`

### Pinia

- `defineStore`
- `storeToRefs`

## Что **не** авто-импортируется

- **Компоненты из `widgets/` и `shared/ui/`** — импортируй через barrel:
  ```vue
  <script setup lang="ts">
  import { AppHeader } from '@/widgets/app-header'
  import { CodeViewer } from '@/shared/ui/base/code-viewer'
  </script>
  ```
- **Сущности** (`useUserStore`, `can`, `type User`) — тоже через barrel:
  ```ts
  import { useUserStore, can, type User } from '@/entities/user'
  ```
- **Утилиты из `shared/lib/`** — явный импорт:
  ```ts
  import { plural, sleep, formatBytes } from '@/shared/lib/utils'
  ```
- **Обёртки `shared/ui/base/*`** — явный импорт через barrel: `import { Button, Card, TextField } from '@/shared/ui/base'`.

## Авто-сканирование компонентов

Плагин `unplugin-vue-components` настроен на `src/shared/components/` (см. [vite.config.mts:70-76](../../vite.config.mts#L70-L76)). Компоненты в `widgets/`, `pages/`, `shared/ui/` **не** сканируются — импортируй вручную через `index.ts`.

> **Фактически авто-регистрация не работает:** директории `src/shared/components/` в проекте нет, плагин сканирует пустоту и генерирует пустой `components.d.ts`. То есть **все** компоненты импортируются явно. Решение — либо завести директорию, либо убрать плагин; зафиксировано в [ROADMAP.md](../../ROADMAP.md), Фаза 1.5.

Типы — в [src/components.d.ts](../../src/components.d.ts) (закоммичено, не редактировать).

## ESLint и авто-импорты

Плагин генерирует [.eslintrc-auto-import.json](../../.eslintrc-auto-import.json) — список глобальных идентификаторов, чтобы ESLint не ругался на «undefined variables».

Файл регенерируется при `dev`/`build`. Не редактировать руками.

## Анти-паттерны

```ts
// ❌ ненужный явный импорт авто-импортируемого
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// ✅ просто используем
const x = ref(0)
const doubled = computed(() => x.value * 2)
export const useFoo = defineStore('foo', () => ({ x, doubled }))
```

```ts
// ❌ обход barrel слайса
import { AppHeader } from '@/widgets/app-header/ui/AppHeader.vue'

// ✅ через публичный API
import { AppHeader } from '@/widgets/app-header'
```

## См. также

- [../../CONTRIBUTING.md § Правила импортов](../../CONTRIBUTING.md)
- [../architecture.md § Auto-imports](../architecture.md)
