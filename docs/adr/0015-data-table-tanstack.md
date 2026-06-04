# 0015. DataTable на headless TanStack Table

- **Status:** accepted
- **Date:** 2026-06-04

## Context

Enterprise-разделам (`/users`, `/roles` и далее) нужна таблица продуктового уровня: сортировка, выбор строк + bulk-действия, пагинация/виртуализация, состояния (loading/empty/error), плотность, sticky-заголовок. Писать эту логику руками — дорого и плохо масштабируется; готовые «батарейки» (AG Grid, PrimeVue DataTable) навязывают свою разметку и стиль, ломая Linear-дизайн-язык ([ADR-0014](0014-brand-emerald-surface-elevation.md)).

## Decision

1. **Движок — `@tanstack/vue-table` (v8, headless).** Даёт только логику (модели строк, сортировка, выбор, пагинация), 0 навязанных стилей. Пара к уже принятому `@tanstack/vue-query` ([ADR-0008](0008-tanstack-query-for-server-state.md)) — единый TanStack-стек, общий ментальный модель.
2. **Презентационная обёртка `DataTable`** в [shared/ui/base/data-table/](../../src/shared/ui/base/data-table/). Вся разметка/стиль — наши, через токены и базовые примитивы. Публичный API через barrel `@/shared/ui/base`: компонент `DataTable` + реэкспорт `createColumnHelper` и типа `ColumnDef` (потребители не импортируют `@tanstack/vue-table` напрямую).
3. **Контракт компонента:**
   - props: `columns` (`ColumnDef[]`), `data`, `loading`, `error`, `density` (`comfortable|compact`), `enableSorting`, `enableSelection`, `enablePagination`, `pageSize`, `getRowId`, `maxHeight`, `empty*`.
   - события: `selectionChange`, `rowClick`, `retry`.
   - слоты: `toolbar`, `bulk-actions` (получает `selectedCount` + `clear`), `empty`, `error`.
4. **Состояния обязательны:** loading → skeleton-строки (`Skeleton`), empty → `EmptyState`, error → `EmptyState` + кнопка «Повторить» (`retry`). Sticky-заголовок, sort-индикатор иконкой + `aria-sort` (смысл не только цветом). Выбор — нативные чекбоксы с `aria-label`, brand-accent; bulk-бар появляется при выделении.
5. **Выбор-колонка рендерится в шаблоне** (leading `<th>/<td>`), а не в модели колонок — чтобы не тянуть `h()`-рендеры в Vue. Generic-SFC (`generic="TData"`) для типобезопасных колонок/данных.

## Consequences

- **+** Полный контроль над видом (Linear), переиспользуемый примитив, типобезопасные колонки.
- **+** Масштабирование: дальше включаются `getFilteredRowModel`, виртуализация (`@tanstack/vue-virtual`), column pinning/sizing — без смены фундамента.
- **+** Единый TanStack-стек с серверным state (Query).
- **−** +зависимость (`@tanstack/vue-table` ~ессентиал), потребители учат column-model API.
- **−** Пока не реализованы: фильтрация/глобальный поиск (есть слот `toolbar`, движок готов), виртуализация, column resize, server-side пагинация. Следующие итерации.
- **−** Чекбоксы — нативные стилизованные (нет примитива `Checkbox`); при росте форм завести отдельный примитив.

Демо-витрина — [/ui-kit/table](../../src/pages/ui-kit/table.vue). Не отменяет другие ADR; дополняет UI-слой.
