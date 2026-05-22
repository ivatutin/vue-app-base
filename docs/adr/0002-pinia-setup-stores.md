# 0002. Pinia setup-stores (composition-style)

- **Status:** accepted
- **Date:** 2026-05-22

## Context

Pinia поддерживает **два стиля** объявления сторов:

1. **Options-стиль** — наследник Vuex 4:
   ```ts
   defineStore('user', {
     state: () => ({ user: null }),
     getters: { isAuthorized: (s) => !!s.user?.isActive },
     actions: { async fetch() { /* ... */ } },
   })
   ```

2. **Setup-стиль** — composition-style:
   ```ts
   defineStore('user', () => {
     const user = ref<User | null>(null)
     const isAuthorized = computed(() => user.value?.isActive ?? false)
     async function fetch() { /* ... */ }
     return { user, isAuthorized, fetch }
   })
   ```

Нужно выбрать один стиль и придерживаться его, чтобы новый код был предсказуемым, а PR-ревью — быстрым.

## Decision

Используем **только setup-стиль** для всех сторов Pinia.

## Consequences

### Положительные

- **Единая ментальная модель с компонентами.** Setup-стор — это, по сути, composable, который Pinia делает singleton'ом. Тот же `ref/computed/watch`, тот же `<script setup>`-стиль. Разработчик не переключает контекст между «логика в компоненте» и «логика в сторе».
- **Прямой доступ ко всему Composition API.** `useTemplateRef`, `provide/inject`, `getCurrentInstance`, `effectScope`, lifecycle-хуки — всё работает прямо в сторе.
- **Простая композиция сторов и composables.** Стор может звать другие composables и переиспользовать их state. В Options API это требует обходных манёвров.
- **Лучшая типизация.** TS вывод типов в composition style мощнее и стабильнее, чем для Options API.
- **Тестируемость.** Setup-функция — обычная функция, легко тестируется без Vue runtime.

### Отрицательные

- **Чуть больше boilerplate** для простых сторов (надо явно `return { ... }`). Это решается копи-пастой и привычкой.
- **Pitfall с деструктуризацией.** `const { user } = useStore()` ломает реактивность state-полей. Решение — `storeToRefs(useStore())`. Это известная боль setup-стиля, фиксируется правилом `pinia/no-store-destructure` (когда подключим ESLint-плагин в Фазе 2 [ROADMAP](../../ROADMAP.md)).
- **Возможно забыть `return`.** Setup-функция без `return` даёт пустой стор. Прецедент уже есть в проекте — см. [KNOWN-ISSUES.md](../../KNOWN-ISSUES.md), пункт 4.

### Что меняется в коде

- Все новые сторы — только в setup-стиле.
- Существующие сторы — уже в setup-стиле ([bootstrap.store.ts](../../src/entities/bootstrap/bootstrap.store.ts), [user.store.ts](../../src/entities/user/model/user.store.ts), [auth.store.ts](../../src/entities/auth/model/auth.store.ts)).

## Альтернативы (для истории)

- **Options-стиль** — отклонён: ломает единство с Composition API компонентов, хуже типизируется.
- **Vuex 4** — отклонён: legacy, плохая поддержка TS.
- **Композбл без Pinia (просто `ref` в module-scope)** — отклонён: нет DevTools, нет SSR-friendly hydration, нет `$reset`.

## Ссылки

- [pinia.vuejs.org/core-concepts/#Setup-Stores](https://pinia.vuejs.org/core-concepts/#setup-stores)
- [ADR-0001](0001-feature-sliced-design.md) — слайсы и сегмент `model/`
- [architecture.md § State management](../architecture.md)
