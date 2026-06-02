# 0007. Уход с Vuetify: целевой UI-стек и стратегия миграции

- **Status:** accepted
- **Date:** 2026-05-26

## Context

Шаблон [vue-app-base](../../README.md) построен на **Vuetify 3.10** (Material Design компоненты), что было прагматичным выбором для быстрого старта. После Фазы 1 ([ROADMAP.md](../../ROADMAP.md)), когда вся инфраструктура (HTTP-клиент, auth, RBAC, error-handler, notification) уже стоит, накопились ограничения, которые на горизонте 1-2 лет станут блокирующими:

1. **Vendor lock-in.** Прямые `<v-btn>`, `<v-card>`, `<v-text-field>` рассыпаны по слайсам. Любая замена UI-фреймворка через 2 года = переписать десятки файлов потребителей. Авторы шаблона **уже это признали**: [ROADMAP.md](../../ROADMAP.md) Фаза 2 содержит `[P2] Vuetify-обёртка в shared/ui/base/` для митигации.

2. **Material Design 3 как обязательная эстетика.** Vuetify-компоненты внешне «гугловые». Если бренд проекта не Material-style — натягивать кастом через `density`, `class`, `style` дорого и хрупко. На каждом миноре Vuetify эти хаки рискуют ломаться.

3. **Bundle weight.** Vuetify ~80 КБ gzipped + `@mdi/font` ~25 КБ. На медленных сетях ощутимо. `vite-plugin-vuetify` с `autoImport: true` помогает деревом-shake'ом, но не радикально (минимальный набор всё равно ~50 КБ).

4. **API-долг.** Часть компонентов Vuetify — наследие v2, между минорами API дрейфует. Например, в `<v-list-item>` `prepend-icon` доступно и как prop, и как slot — оба способа официально валидны, что приводит к неконсистентности кодовой базы.

5. **Скорость поддержки.** GitHub-issues Vuetify часто залипают на месяцы. Критичные баги при production-эксплуатации могут заблокировать релиз.

6. **Тренд индустрии 2024-2026.** Сдвиг от monolithic UI-kit'ов к **headless + own design system** (shadcn в React, shadcn-vue + Radix-vue в Vue, Tailwind v4 в обоих). Это даёт владение кодом компонентов, нулевой runtime UI-kit и брендирование под продукт, а не подгонку продукта под фреймворк.

Решение **уйти с Vuetify** принято. Этот ADR фиксирует **целевой стек** и **стратегию миграции** — strangler fig pattern, без bigbang.

## Decision

### Целевой стек — ядро (всегда стоит)

| Слой | Решение | Зачем |
|------|---------|-------|
| **UI-компоненты (база)** | **shadcn-vue** | CLI копирует компоненты в `src/shared/ui/base/`. Ноль runtime UI-kit зависимости, владение кодом, простая брендировка. Лидер Vue-экосистемы 2025+. |
| **Accessibility primitives** | **radix-vue** (под shadcn-vue) | Focus management, ARIA, keyboard navigation — не изобретаем велосипед, не теряем доступность. |
| **Стили** | **Tailwind v4** | Atomic CSS без runtime, нативный bundle ~10 КБ, конфиг через CSS-vars (естественная интеграция с design tokens). |
| **Иконки** | **lucide-vue-next** | ~2-3 КБ за иконку, tree-shake, современная эстетика, заменяет `@mdi/font` (~25 КБ как единый файл). |
| **Composables** | **VueUse** | Утилитарные composables (useStorage, useEventListener, useDebounce, ...). Не зависит от UI, должен быть в любом Vue-проекте. |
| **Forms + валидация** | **VeeValidate + Zod-resolver** | Уже в [ROADMAP.md](../../ROADMAP.md) Фаза 2 (`[P2] Form architecture`). Естественно ложится в миграцию. |
| **Date/time (lib)** | **date-fns** | Утилитарная либа для манипуляций датами. Используется внутри custom-DatePicker'ов и валидации форм. |

### Целевой стек — точечное расширение (по триггеру)

shadcn-vue **намеренно** не покрывает enterprise-виджеты — он фокусируется на повседневном UI. Когда конкретный сложный компонент понадобится, добавляем специализированную либу **точечно**, через тот же фасад `src/shared/ui/base/<Component>/`. Это сохраняет принцип «потребители видят только наш API», не возвращая Vuetify-style lock-in.

**Правила точечного расширения:**

1. **Триггер фиксируется заранее** (см. таблицу ниже). Без явного триггера новая UI-либа не добавляется.
2. **Каждая либа — обёрнута в `shared/ui/base/`** с проектным API. Прямой `<DataTable>` от PrimeVue в widget/page **запрещён** тем же lint-правилом, что и `<v-*>`.
3. **Стилизуется через design tokens и Tailwind** (PrimeVue 4 Unstyled-mode, AG Grid CSS-vars). Никаких встроенных тем.
4. **Vitest + Storybook** на обёртку обязательны — как и для shadcn-vue компонентов.
5. **Замена/удаление либы — переписать только обёртку**, не потребителей.

**Решающее дерево по сложным компонентам:**

| Триггер | Что взять | Почему именно это |
|---------|-----------|-------------------|
| **DataTable** — server-side pagination + multi-sort + column resize + row-grouping + virtual scroll | **PrimeVue DataTable** (Unstyled) или **AG Grid Community** | Собирать на TanStack Table — 1-2 недели работы. PrimeVue DataTable — лучший в Vue-экосистеме, AG Grid — лучший в JS целиком. **Дефолт — PrimeVue** (плотнее интегрируется с Vue, бесплатен, проще в обёртке). AG Grid — если нужны Excel-export, master/detail, pivoting. |
| **DataTable простой** — без серверной пагинации, < 200 строк | **TanStack Table v8** | Headless, легче, минимум зависимостей. Не тащим тяжёлый PrimeVue ради базового списка. |
| **DatePicker / Calendar** — продакшен-grade с локализацией, range, диапазонами | **PrimeVue DatePicker** (Unstyled) | radix-vue Calendar — primitives, не закроет полный picker. Собирать самим — 1 неделя. PrimeVue даёт готовое. |
| **DatePicker простой** — одиночная дата в форме | **radix-vue + date-fns + shadcn-vue Calendar** | Лёгкий, контролируемый, без новой зависимости. |
| **FileUpload** — drag-and-drop, прогресс, chunked, превью | **PrimeVue FileUpload** или **vue-filepond** | Собирать DnD + progress + multi-file самим — рискованно и долго. **Дефолт — PrimeVue** (если уже подключён). |
| **Tree / TreeTable** | **PrimeVue Tree/TreeTable** (Unstyled) | radix-vue не имеет, собирать с нуля — много работы по a11y и keyboard navigation. |
| **Schedule / Calendar (event-grid)** | **FullCalendar** | Лучший event-calendar в JS-мире, не конкурент в этой нише. PrimeVue Schedule — обёртка над FullCalendar. |
| **Charts** | **ECharts** или **Chart.js** + vue-wrapper | Это про данные, не про UI-kit. Выбор зависит от сложности (ECharts — мощнее, Chart.js — проще). |
| **Rich Text Editor** | **TipTap** | Headless, на ProseMirror, кастомизируется через Tailwind. PrimeVue Editor — обёртка над Quill, менее гибкий. |
| **Stepper / Wizard** | **shadcn-vue + Tailwind** (собрать самим) | Простая структура, состояние держится в Pinia. Не нужна либа. |

**Когда добавляется первая «тяжёлая» либа** (например, PrimeVue для DataTable), создаётся **ADR-XX** «Точечное добавление PrimeVue для DataTable» с обоснованием конкретного выбора (PrimeVue vs AG Grid vs TanStack) и фиксацией обёрток. Это **не** замена ADR-0007, а его уточнение под конкретный кейс.

### Стратегия миграции — strangler fig pattern

### Стратегия миграции — strangler fig pattern

**Принцип:** Vuetify уходит постепенно, **без bigbang**. Два UI-фреймворка сосуществуют 2-3 месяца. На каждом этапе приложение работает. Любую фазу можно остановить, оставшись на стабильной точке.

**Ключевые инварианты:**

1. **Прямые `<v-*>` запрещены вне `shared/ui/base/`** (ESLint-правило, добавляется в Фазе 2.5).
2. **Каждая обёртка живёт с тестами (Vitest) и историей (Storybook).** Без этого подмена реализации — игра в рулетку.
3. **Design tokens — единственный источник истины для цветов/spacing/typography.** Сначала Vuetify-тема собирается из них, потом — Tailwind. Замена UI-фреймворка не затрагивает ни одного цвета.
4. **Feature-flag per компонент.** В фазе замены реализации каждая обёртка может рендерить старую (Vuetify) или новую (shadcn-vue) реализацию через env/storage флаг — позволяет визуально сравнить и плавно переключить.

### Фазовое разбиение

Фазы 2.5-2.9 (см. также [ROADMAP.md](../../ROADMAP.md), Фаза 2 — пункты с поднятым приоритетом):

#### Фаза 2.5 — Фундамент `done` (2026-05-26)

Сделано (без касания UI-кода):

- `Vitest + Vue Test Utils` — поднят из ROADMAP Фазы 2.
- `Storybook 8` — поднят из ROADMAP Фазы 3.
- `Design tokens` в `src/shared/assets/tokens/` (CSS-vars) — поднят из ROADMAP Фазы 3.
- Vuetify-тема собиралась из tokens (через `createVuetify({ theme: { themes: { light: { colors: { ... } }}}})` с `var(--token-*)`). На момент Фазы 2.5 — actively used; снят в Фазе 2.9.
- `Tailwind v4` setup параллельно Vuetify (через `@tailwindcss/vite`).
- ESLint-правило: `no-restricted-imports` запрещал `import 'vuetify'` и `<v-*>`-теги вне `src/shared/ui/base/`. Снят в Фазе 2.9.

**Результат:** инфраструктура готова, ничего визуально не изменилось.

#### Фаза 2.6 — Слой обёрток поверх Vuetify `done` (2026-05-28)

Создан `src/shared/ui/base/<Component>/` для каждого используемого Vuetify-компонента. **Без замены реализации**, только доменный API.

**Чек-лист обёртки:**
- Props на проектном языке (`<Button variant="primary" loading size="md">`, не `color="primary" :loading`).
- Использует только design tokens.
- `*.test.ts` (Vitest) — render + основные interactions.
- `*.stories.ts` (Storybook) — все variant/size/state.
- Экспортируется через `src/shared/ui/base/index.ts`.

**Порядок (по частоте + простоте):**

| Приоритет | Обёртка | Vuetify-эквивалент |
|-----------|---------|-------------------|
| 1 | `Button` | `v-btn` |
| 1 | `TextField` | `v-text-field` |
| 1 | `Card` (+ Header/Body/Footer) | `v-card` + `v-card-*` |
| 1 | `Icon` | `v-icon` |
| 2 | `Divider`, `Alert`, `Form`, `Spacer` | `v-divider`, `v-alert`, `v-form`, `v-spacer` |
| 3 | `Menu`/`Dropdown`, `List`/`ListItem`, `Snackbar` | `v-menu`, `v-list`/`v-list-item`, `v-snackbar` |
| 4 | `AppBar`, `NavigationDrawer`, `Container`/`AppShell` | `v-app-bar`, `v-navigation-drawer`, `v-container`/`v-layout`/`v-main`/`v-app` |

Параллельно: миграция потребителей (`<v-btn>` → `<Button>` и т.п.), PR per category.

**Результат:** все прямые `<v-*>` ушли в `shared/ui/base/`. Lint-правило падает на нарушения.

#### Фаза 2.7 — Замена реализации в обёртках `done` (2026-05-29)

Закрыта цепочкой коммитов `348783d…b1fe76c`. Сделано:

- shadcn-vue init вручную (CLI-конфиг `components.json`, `cn()` хелпер, ядро зависимостей `reka-ui` + `class-variance-authority` + `clsx` + `tailwind-merge` + `@lucide/vue` + `@vueuse/core`).
- Feature-flag `VITE_UI_IMPL=vuetify|shadcn` — каждая обёртка получала parallel-реализацию `<Component>.shadcn.vue` рядом с `.vuetify.vue` + entry `<Component>.vue` с runtime-выбором по флагу. Это позволило мигрировать **по одной обёртке** атомарными коммитами с side-by-side ревью в Storybook.
- 11 обёрток мигрированы по списку: Spacer → Divider (`reka-ui` Separator) → Icon (`@lucide/vue` + словарь `MDI_TO_LUCIDE`) → Button (`reka-ui` Primitive + cva) → Alert (cva + compoundVariants) → TextField (composite Input + Label с `useId()` a11y) → Card (custom composite с border-t footer) → Form (нативный `<form>`) → List/ListItem (Tailwind nav + RouterLink) → Menu (`reka-ui` Popover) → Snackbar (custom card + setTimeout auto-dismiss).
- После переключения default → `shadcn` потребовались три hotfix'а: `effectScope()` для watch'а вне Vue setup (df7d6c3); удаление TS-аннотаций из template inline-handlers — Vue silently игнорирует их (3023e7c); z-[3000] на PopoverContent выше Vuetify overlay-container z-index 2400 (b1fe76c).
- Финальная чистка (Шаг 2.7.14): удаление `*.vuetify.vue`, упрощение entry до прямой реализации, удаление `VITE_UI_IMPL` из env, удаление Vuetify setup из Storybook preview.

**Результат:** все `shared/ui/base/*` работают на shadcn-vue + reka-ui + Tailwind. Vuetify остаётся в зависимостях для shell (App.vue, layouts, header/sidebar/footer) — переезд в Фазе 2.8.

#### Фаза 2.8 — Свой shell + ThemeProvider `done` (2026-06-02)

Цепочка коммитов `2893ff0…2880678`. Сделано:

- **ThemeProvider** — composable `useTheme()` в [src/shared/lib/theme/](../../src/shared/lib/theme/) (singleton state на module level + effectScope для watcher'ов вне Vue setup): mode `'light'|'dark'|'system'`, listener на `prefers-color-scheme`, persist в localStorage (ключ `__app-theme`), sync `.dark` класса на html. 7 unit-тестов в happy-dom. Inline-script anti-FOUC в [index.html](../../index.html) ставит класс до загрузки JS.
- **AppHeader** — `<v-app-bar>` → `<header>` + Tailwind flex; `useTheme()` from 'vuetify' → from `@/shared/lib/theme`.
- **AppSidebar** — `<v-navigation-drawer rail>` → `<aside>` + Tailwind transition `w-14`↔`w-56`.
- **AppFooter** — `<v-footer>` → `<footer>` + Tailwind flex.
- **Layouts** — `default.vue` переписан на Tailwind grid `rows-[auto_1fr_auto] × cols-[auto_1fr]`; `auth.vue` — flex center + max-w-md. Оба без `<v-app>`/`<v-main>`/`<v-container>`.
- **App.vue** — убран `<v-app>` wrapper.
- **CodeViewer** — мигрирован с `<v-card>+<v-btn>+<v-card-text>` на наши обёртки.
- **Menu** — откатили `z-[3000]` обратно к `z-50` (Vuetify overlay-container больше нет).
- **`vite-plugin-vuetify`** удалён из vite.config.mts.

Подводные камни (зафиксированы в hotfix-коммитах):
- `watch(...)` вне Vue setup нужен `effectScope(true).run(...)` (df7d6c3).
- TS-аннотации в template inline-handlers Vue silently игнорирует (3023e7c).
- `<v-app>` overlay z-index 2400 перекрывал PopoverContent z-50 — пришлось z-[3000] временно (b1fe76c).
- Tailwind v4 + `<alpha-value>` обёртка в @theme не реагирует на `.dark` переопределения. Решение: в `colors.css` хранить полные `rgb()` без префикса `--color-`, в `@theme` ссылаться через `var(--background)` (2880678) — стандартный shadcn-vue v4 pattern.

#### Фаза 2.9 — Удаление Vuetify `done` (2026-06-02)

Коммит `5253c63`. `npm uninstall vuetify @mdi/font @fontsource/roboto vite-plugin-vuetify sass-embedded unplugin-fonts` (6 пакетов). Удалены файлы: `src/app/providers/setup-vuetify.ts`, `vuetify-theme.ts`, `src/assets/styles/settings.scss`, `src/assets/logo.{png,svg}`. ESLint правила `no-restricted-imports`/`vue/no-restricted-syntax` для vuetify удалены вместе с whitelist'ом. `npm ls vuetify` — пусто.

**Точка невозврата пройдена.**

### Метрики успеха

| Метрика | Цель |
|---------|------|
| Bundle size (gzipped) — ядро без сложных компонентов | −50…−70 КБ (с ~80 КБ Vuetify + ~25 КБ MDI → ~20-30 КБ Tailwind + lucide). При добавлении PrimeVue точечно — выигрыш меньше, но всё равно положительный за счёт tree-shake'инга. |
| Lighthouse Performance | +5-10 пунктов |
| Time to Interactive (3G) | −200…−500 мс |
| `npm ls vuetify` | пусто (после Фазы 2.9) |
| Visual regressions при миграции | 0 (через Storybook side-by-side) |
| Покрытие тестами `shared/ui/base/` | ≥ 80% |

### Ответственность фаз

- **Фазы 2.5-2.6 обязательны.** Они дают **80% выгоды (защита от vendor lock-in) за 30% усилий** и оставляют опцию остановиться, не уходя с Vuetify. Это полезно даже если решение «уходить» отменится.
- **Фазы 2.7-2.9 — собственно миграция.** Можно начинать только после полного завершения 2.5-2.6 (без них замена реализации — игра вслепую).
- **Фазы делаются параллельно продуктовым задачам.** Миграция не должна заморозить разработку фичей.

## Consequences

### Положительные

- **Владение UI-кодом.** Компоненты в `src/shared/ui/base/` — твои файлы, можно править без оглядки на upstream.
- **Брендирование без боли.** Не натягиваем дизайн на Material Design 3.
- **Меньше bundle.** Целевой минус 50-70 КБ — на медленных сетях это 1-2 секунды.
- **Современный стек.** Tailwind v4 + shadcn-vue — индустриальный тренд, в команду легче нанимать.
- **Лучшая accessibility.** Radix-vue primitives — best-in-class. У Vuetify a11y тоже есть, но не такая системная.
- **Готовность к Vue 4 / следующим major.** При уходе с Vuetify нет ожидания «когда выйдет Vuetify 4».

### Отрицательные

- **7-12 недель календарной работы** параллельно с фичами. Команда должна это вместить.
- **Кривая обучения Tailwind** — если нет опыта. Митигация: 1-2 дня обучения в Фазе 2.5 + CONTRIBUTING.md с примерами.
- **Нужен дизайнер для ревью** в Фазе 2.7. Без него обёртки рискуют выглядеть «программистски».
- **Стартовый объём работы по дизайн-системе.** Tokens, типографика, scale, dark theme — это не «выберем 5 цветов». Митигация: использовать дефолты shadcn-vue/Radix как отправную точку, постепенно подгонять.
- **Регрессы UX неизбежны** при замене реализации. Митигация: feature-flag per компонент + Storybook side-by-side + smoke-тесты.

### Что меняется в коде (поэтапно)

- **Фаза 2.5:** новые директории `src/shared/assets/tokens/`, файлы конфигурации (Vitest, Storybook, Tailwind). `setup-vuetify.ts` модифицируется на чтение токенов. ESLint-конфиг получает `no-restricted-imports`.
- **Фаза 2.6:** новый слой `src/shared/ui/base/<Component>/`. Все потребители `<v-*>` (widgets, pages) переписываются на `<Button>`/`<TextField>`/etc.
- **Фаза 2.7:** реализации внутри `shared/ui/base/<Component>/` переписываются на shadcn-vue + Tailwind. Feature-flag в env.
- **Фаза 2.8:** новые сложные компоненты (DataTable, DatePicker, Dialog). Замена `useTheme()`, `<v-app>` шелла.
- **Фаза 2.9:** удаление Vuetify-зависимостей и связанной инфраструктуры.

## Альтернативы (для истории)

### Остаться на Vuetify

Не выбран. Vendor lock-in уже растёт, bundle проигрывает альтернативам. Через 1-2 года миграция станет дороже в разы.

### PrimeVue целиком как замена Vuetify

Рассмотрен. Сильные стороны: лучшие в Vue-экосистеме enterprise data-table'ы, ~100+ готовых компонентов, активная поддержка PrimeTek. Слабые: bundle сравним с Vuetify, vendor lock-in не исчезает (просто меняется фреймворк), эстетика «корпоративная». Подходит, если приоритет — «много готового из коробки», но не решает базовых проблем Vuetify (lock-in, bundle, бренд).

**Однако PrimeVue принят как opt-in для сложных компонентов** через Unstyled-режим (см. раздел Decision → «Точечное расширение»). Это даёт лучшие data-table/datepicker/file-upload Vue-экосистемы без переноса lock-in'а на весь UI.

### Naive UI

Рассмотрен. Сильные стороны: TypeScript-first, лёгкий bundle, чистый API. Слабые: меньшая экосистема, документация местами «китайская» (примеры не покрывают западные UX-паттерны типа Stripe), меньше готовых компонентов уровня PrimeVue/Vuetify. Хороший выбор для проекта без сложных таблиц, но не оптимален здесь.

### Element Plus / Ant Design Vue

Не выбраны. Заточены под китайский enterprise-стиль, эстетика плохо адаптируется под западные B2B-продукты. Bundle тяжёлый, vendor lock-in остаётся.

### Headless (radix-vue + Tailwind) без shadcn-vue

Рассмотрен как «более радикальный» вариант. Полная DIY-сборка дизайн-системы. Отвергнут как стартовая точка: shadcn-vue даёт **готовые** реализации компонентов поверх radix-vue, экономя 2-4 недели работы. После Фазы 2.7 при необходимости можно собирать что угодно поверх radix-vue — shadcn-vue не мешает, его компоненты — обычные `.vue`-файлы в нашем коде.

### TanStack Query вместо переезда на Tailwind

Не альтернатива — TanStack Query про другой слой (server state). Этот пункт остаётся в [ROADMAP.md](../../ROADMAP.md) Фаза 2 независимо от UI-стека.

## Ссылки

- [ROADMAP.md](../../ROADMAP.md) — пункты Фазы 2, поднимаемые в приоритет (Vuetify-обёртка, Design tokens, Storybook, Vitest, Form architecture).
- [ADR-0001](0001-feature-sliced-design.md) — FSD-слои. `shared/ui/base/` — это `shared/`-слой, доступен любому слою выше.
- [ADR-0005](0005-dto-domain-mapping.md) — паттерн «фасад с собственным API» (DTO ↔ Domain). Обёртки UI — тот же паттерн, только для view-слоя.
- [shadcn-vue.com](https://www.shadcn-vue.com) — целевой UI-инструмент.
- [tailwindcss.com](https://tailwindcss.com) — Tailwind v4.
- [tanstack.com/table](https://tanstack.com/table) — TanStack Table.
- [radix-vue.com](https://www.radix-vue.com) — Radix-vue primitives.
