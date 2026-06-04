<script setup lang="ts" generic="TData">
  /**
   * DataTable — презентационная обёртка над @tanstack/vue-table (headless).
   * Движок даёт логику (сортировка/выбор/пагинация), мы владеем всей
   * разметкой и стилем (Linear-вид). ADR-0015.
   *
   * Состояния обязательны: loading → skeleton-строки, empty → EmptyState,
   * error → блок с ретраем (слот #error / событие retry). Смысл не цветом:
   * sort-индикатор — иконка + `aria-sort`, выбор — нативные чекбоксы с label.
   *
   * Колонки описываются через ColumnDef (createColumnHelper из barrel).
   * Выбор строк рендерится отдельной leading-колонкой в шаблоне (а не в
   * модели колонок) — так не нужны h()-рендеры в Vue.
   */
  import type {
    ColumnDef,
    ColumnFiltersState,
    RowSelectionState,
    SortingState,
  } from '@tanstack/vue-table'
  import {
    FlexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useVueTable,
  } from '@tanstack/vue-table'
  import Button from '../button/Button.vue'
  import EmptyState from '../empty-state/EmptyState.vue'
  import Icon from '../icon/Icon.vue'
  import Skeleton from '../skeleton/Skeleton.vue'

  const props = withDefaults(defineProps<{
    columns: ColumnDef<TData, any>[]
    data: TData[]
    loading?: boolean
    error?: boolean | string
    density?: 'comfortable' | 'compact'
    enableSorting?: boolean
    enableSelection?: boolean
    enablePagination?: boolean
    searchable?: boolean
    searchPlaceholder?: string
    pageSize?: number
    skeletonRows?: number
    maxHeight?: string
    emptyIcon?: string
    emptyTitle?: string
    emptyDescription?: string
    getRowId?: (row: TData, index: number) => string
  }>(), {
    loading: false,
    error: false,
    density: 'comfortable',
    enableSorting: true,
    enableSelection: false,
    enablePagination: false,
    searchable: false,
    searchPlaceholder: 'Поиск…',
    pageSize: 10,
    skeletonRows: 5,
    maxHeight: undefined,
    emptyIcon: 'mdi-inbox',
    emptyTitle: 'Нет данных',
    emptyDescription: undefined,
    getRowId: undefined,
  })

  const emit = defineEmits<{
    'selection-change': [rows: TData[]]
    'row-click': [row: TData]
    'retry': []
  }>()

  const sorting = ref<SortingState>([])
  const rowSelection = ref<RowSelectionState>({})
  const globalFilter = ref('')
  const columnFilters = ref<ColumnFiltersState>([])

  const table = useVueTable({
    get data () {
      return props.data
    },
    get columns () {
      return props.columns
    },
    state: {
      get sorting () {
        return sorting.value
      },
      get rowSelection () {
        return rowSelection.value
      },
      get globalFilter () {
        return globalFilter.value
      },
      get columnFilters () {
        return columnFilters.value
      },
    },
    enableRowSelection: () => props.enableSelection,
    getRowId: props.getRowId,
    onSortingChange: updater => {
      sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
    },
    onRowSelectionChange: updater => {
      rowSelection.value = typeof updater === 'function' ? updater(rowSelection.value) : updater
      emit('selection-change', table.getSelectedRowModel().rows.map(r => r.original))
    },
    onGlobalFilterChange: updater => {
      globalFilter.value = typeof updater === 'function' ? updater(globalFilter.value) : updater
    },
    onColumnFiltersChange: updater => {
      columnFilters.value = typeof updater === 'function' ? updater(columnFilters.value) : updater
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: props.enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: props.enablePagination ? getPaginationRowModel() : undefined,
    initialState: {
      pagination: { pageSize: props.pageSize, pageIndex: 0 },
    },
  })

  /** Кол-во визуальных колонок (для colspan в состояниях). */
  const colSpan = computed(() => props.columns.length + (props.enableSelection ? 1 : 0))

  const selectedCount = computed(() => table.getSelectedRowModel().rows.length)

  const cellPad = computed(() =>
    props.density === 'compact' ? 'px-3 py-1.5' : 'px-3 py-2.5',
  )

  const isEmpty = computed(() =>
    !props.loading && !props.error && props.data.length === 0,
  )

  /** Данные есть, но фильтр/поиск ничего не вернул — это не «пусто». */
  const isNoResults = computed(() =>
    !props.loading && !props.error && props.data.length > 0
    && table.getFilteredRowModel().rows.length === 0,
  )

  function resetFilters () {
    globalFilter.value = ''
    table.resetColumnFilters()
  }

  const errorText = computed(() =>
    typeof props.error === 'string' ? props.error : 'Не удалось загрузить данные.',
  )

  function clearSelection () {
    table.resetRowSelection()
  }

  function ariaSort (state: false | 'asc' | 'desc'): 'none' | 'ascending' | 'descending' {
    if (state === 'asc') return 'ascending'
    if (state === 'desc') return 'descending'
    return 'none'
  }

  // Доступ к инстансу таблицы из toolbar-слота (:table) и через ref.
  defineExpose({ table })
</script>

<template>
  <div class="space-y-3">
    <!-- Тулбар: поиск + пользовательские фильтры -->
    <div v-if="searchable || $slots.toolbar" class="flex flex-wrap items-center gap-2">
      <div v-if="searchable" class="relative">
        <Icon
          class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          name="mdi-magnify"
          size="sm"
        />
        <input
          v-model="globalFilter"
          aria-label="Поиск по таблице"
          class="h-9 w-64 max-w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :placeholder="searchPlaceholder"
          type="text"
        >
        <button
          v-if="globalFilter"
          aria-label="Очистить поиск"
          class="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded text-muted-foreground hover:text-foreground"
          type="button"
          @click="globalFilter = ''"
        >
          <Icon name="mdi-close" size="sm" />
        </button>
      </div>
      <slot name="toolbar" :table="table" />
    </div>

    <!-- Bulk-бар выбора -->
    <div
      v-if="enableSelection && selectedCount > 0"
      class="flex items-center gap-3 rounded-lg border bg-brand/5 px-3 py-2 text-sm"
    >
      <span class="font-medium text-brand">Выбрано: {{ selectedCount }}</span>
      <div class="flex items-center gap-2">
        <slot :clear="clearSelection" name="bulk-actions" :selected-count="selectedCount" />
      </div>
      <div class="flex-1" />
      <Button size="xs" variant="text" @click="clearSelection">Сбросить</Button>
    </div>

    <!-- Контейнер таблицы -->
    <div
      class="overflow-auto rounded-lg border"
      :style="maxHeight ? { maxHeight } : undefined"
    >
      <table class="w-full border-collapse text-sm">
        <!-- Заголовок (sticky) -->
        <thead class="sticky top-0 z-10 bg-surface">
          <tr
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
            class="border-b"
          >
            <!-- Колонка выбора -->
            <th v-if="enableSelection" class="w-10" :class="cellPad">
              <input
                :ref="el => { if (el) (el as HTMLInputElement).indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected() }"
                aria-label="Выбрать все строки"
                :checked="table.getIsAllPageRowsSelected()"
                class="size-4 cursor-pointer accent-brand align-middle"
                type="checkbox"
                @change="table.getToggleAllPageRowsSelectedHandler()($event)"
              >
            </th>
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              :aria-sort="header.column.getCanSort() ? ariaSort(header.column.getIsSorted()) : undefined"
              class="text-left align-middle font-medium text-muted-foreground"
              :class="cellPad"
            >
              <button
                v-if="!header.isPlaceholder && header.column.getCanSort()"
                class="inline-flex items-center gap-1.5 cursor-pointer select-none rounded -mx-1 px-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
                @click="header.column.getToggleSortingHandler()?.($event)"
              >
                <FlexRender :props="header.getContext()" :render="header.column.columnDef.header" />
                <Icon
                  v-if="header.column.getIsSorted() === 'asc'"
                  name="mdi-chevron-double-up"
                  size="sm"
                />
                <Icon
                  v-else-if="header.column.getIsSorted() === 'desc'"
                  class="rotate-180"
                  name="mdi-chevron-double-up"
                  size="sm"
                />
                <Icon v-else class="opacity-30" name="mdi-unfold-more-vertical" size="sm" />
              </button>
              <FlexRender
                v-else-if="!header.isPlaceholder"
                :props="header.getContext()"
                :render="header.column.columnDef.header"
              />
            </th>
          </tr>
        </thead>

        <tbody>
          <!-- Loading: skeleton-строки -->
          <template v-if="loading">
            <tr v-for="n in skeletonRows" :key="`sk-${n}`" class="border-b last:border-0">
              <td v-if="enableSelection" :class="cellPad">
                <Skeleton class="size-4" />
              </td>
              <td v-for="col in columns.length" :key="col" :class="cellPad">
                <Skeleton class="h-4" :class="col === 1 ? 'w-2/3' : 'w-1/2'" />
              </td>
            </tr>
          </template>

          <!-- Error -->
          <tr v-else-if="error">
            <td :class="cellPad" :colspan="colSpan">
              <slot name="error">
                <EmptyState
                  description="Проверьте соединение и попробуйте ещё раз."
                  icon="mdi-file-question"
                  :title="errorText"
                >
                  <Button size="sm" variant="outlined" @click="emit('retry')">
                    <template #prepend>
                      <Icon name="mdi-refresh" size="sm" />
                    </template>
                    Повторить
                  </Button>
                </EmptyState>
              </slot>
            </td>
          </tr>

          <!-- Empty -->
          <tr v-else-if="isEmpty">
            <td :class="cellPad" :colspan="colSpan">
              <slot name="empty">
                <EmptyState
                  :description="emptyDescription"
                  :icon="emptyIcon"
                  :title="emptyTitle"
                />
              </slot>
            </td>
          </tr>

          <!-- No results (данные есть, фильтр пуст) -->
          <tr v-else-if="isNoResults">
            <td :class="cellPad" :colspan="colSpan">
              <slot name="no-results" :reset="resetFilters">
                <EmptyState
                  description="Измените запрос или сбросьте фильтры."
                  icon="mdi-magnify"
                  title="Ничего не найдено"
                >
                  <Button size="sm" variant="outlined" @click="resetFilters">
                    Сбросить фильтры
                  </Button>
                </EmptyState>
              </slot>
            </td>
          </tr>

          <!-- Данные -->
          <tr
            v-for="row in table.getRowModel().rows"
            v-else
            :key="row.id"
            class="border-b last:border-0 transition-colors hover:bg-accent/50"
            :class="row.getIsSelected() && 'bg-brand/5'"
            @click="emit('row-click', row.original)"
          >
            <td v-if="enableSelection" :class="cellPad" @click.stop>
              <input
                aria-label="Выбрать строку"
                :checked="row.getIsSelected()"
                class="size-4 cursor-pointer accent-brand align-middle"
                :disabled="!row.getCanSelect()"
                type="checkbox"
                @change="row.getToggleSelectedHandler()($event)"
              >
            </td>
            <td
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              class="align-middle"
              :class="cellPad"
            >
              <FlexRender :props="cell.getContext()" :render="cell.column.columnDef.cell" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Пагинация -->
    <div
      v-if="enablePagination && !loading && !error && !isEmpty && !isNoResults"
      class="flex items-center justify-between gap-3 text-sm text-muted-foreground"
    >
      <span class="tabular-nums">
        Стр. {{ table.getState().pagination.pageIndex + 1 }} из {{ table.getPageCount() }}
        · всего {{ table.getRowCount() }}
      </span>
      <div class="flex items-center gap-2">
        <Button
          :disabled="!table.getCanPreviousPage()"
          size="sm"
          variant="outlined"
          @click="table.previousPage()"
        >
          Назад
        </Button>
        <Button
          :disabled="!table.getCanNextPage()"
          size="sm"
          variant="outlined"
          @click="table.nextPage()"
        >
          Вперёд
        </Button>
      </div>
    </div>
  </div>
</template>
