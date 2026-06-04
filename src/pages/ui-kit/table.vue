<script setup lang="ts">
  import { h } from 'vue'
  import { Button, type ColumnDef, createColumnHelper, DataTable, Icon, type RowAction, RowActions, StatusBadge } from '@/shared/ui/base'

  definePage({
    meta: { title: 'DataTable' },
  })

  interface User {
    id: string
    name: string
    email: string
    role: string
    status: 'active' | 'invited' | 'blocked'
    createdAt: string
  }

  const ALL_USERS: User[] = [
    { id: '1', name: 'Анна Кузнецова', email: 'anna@example.com', role: 'Admin', status: 'active', createdAt: '2026-01-12' },
    { id: '2', name: 'Борис Петров', email: 'boris@example.com', role: 'Editor', status: 'active', createdAt: '2026-02-03' },
    { id: '3', name: 'Вера Смирнова', email: 'vera@example.com', role: 'Viewer', status: 'invited', createdAt: '2026-02-20' },
    { id: '4', name: 'Глеб Иванов', email: 'gleb@example.com', role: 'Editor', status: 'blocked', createdAt: '2026-03-01' },
    { id: '5', name: 'Дарья Орлова', email: 'darya@example.com', role: 'Admin', status: 'active', createdAt: '2026-03-15' },
    { id: '6', name: 'Егор Соколов', email: 'egor@example.com', role: 'Viewer', status: 'invited', createdAt: '2026-03-28' },
    { id: '7', name: 'Жанна Морозова', email: 'zhanna@example.com', role: 'Editor', status: 'active', createdAt: '2026-04-05' },
    { id: '8', name: 'Игорь Волков', email: 'igor@example.com', role: 'Viewer', status: 'blocked', createdAt: '2026-04-18' },
    { id: '9', name: 'Ксения Зайцева', email: 'ksenia@example.com', role: 'Admin', status: 'active', createdAt: '2026-05-02' },
    { id: '10', name: 'Лев Новиков', email: 'lev@example.com', role: 'Editor', status: 'active', createdAt: '2026-05-19' },
    { id: '11', name: 'Мария Белова', email: 'maria@example.com', role: 'Viewer', status: 'invited', createdAt: '2026-05-30' },
    { id: '12', name: 'Никита Гусев', email: 'nikita@example.com', role: 'Editor', status: 'active', createdAt: '2026-06-01' },
  ]

  const STATUS = {
    active: { label: 'Активен', tone: 'success' },
    invited: { label: 'Приглашён', tone: 'warning' },
    blocked: { label: 'Заблокирован', tone: 'error' },
  } as const

  function statusCell (value: User['status']) {
    return h(StatusBadge, { label: STATUS[value].label, tone: STATUS[value].tone })
  }

  // Демо-обработчик действий — пишем последнее действие под таблицу.
  const lastAction = ref('')
  function makeActions (u: User): RowAction[] {
    return [
      { label: 'Изменить', icon: 'mdi-pencil', onClick: () => (lastAction.value = `Изменить: ${u.name}`) },
      { label: 'Копировать e-mail', icon: 'mdi-content-copy', onClick: () => (lastAction.value = `Скопирован e-mail: ${u.email}`) },
      { label: 'Удалить', icon: 'mdi-delete', danger: true, dividerBefore: true, onClick: () => (lastAction.value = `Удалить: ${u.name}`) },
    ]
  }

  const col = createColumnHelper<User>()
  const columns = [
    col.accessor('name', { header: 'Имя', cell: i => i.getValue() }),
    col.accessor('email', { header: 'E-mail', cell: i => h('span', { class: 'text-muted-foreground' }, i.getValue()) }),
    col.accessor('role', { header: 'Роль', cell: i => i.getValue() }),
    col.accessor('status', { header: 'Статус', filterFn: 'equalsString', cell: i => statusCell(i.getValue()) }),
    col.accessor('createdAt', { header: 'Создан', cell: i => h('span', { class: 'tabular-nums text-muted-foreground' }, i.getValue()) }),
    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => h('div', { class: 'flex justify-end' }, h(RowActions, { actions: makeActions(row.original) })),
    }),
  ] as ColumnDef<User, any>[]

  // --- демо-управление ---
  type StateMode = 'data' | 'loading' | 'refetch' | 'empty' | 'error'
  const mode = ref<StateMode>('data')
  const density = ref<'comfortable' | 'compact'>('comfortable')
  const selected = ref<User[]>([])

  // 'loading' = первая загрузка (данных нет → skeleton);
  // 'refetch' = обновление поверх данных (мягкий оверлей).
  const rows = computed(() =>
    (mode.value === 'empty' || mode.value === 'loading' ? [] : ALL_USERS),
  )
  const isLoading = computed(() => mode.value === 'loading' || mode.value === 'refetch')
  const modes: { key: StateMode, label: string }[] = [
    { key: 'data', label: 'Данные' },
    { key: 'loading', label: 'Загрузка' },
    { key: 'refetch', label: 'Рефетч' },
    { key: 'empty', label: 'Пусто' },
    { key: 'error', label: 'Ошибка' },
  ]
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">
        UI Kit · DataTable
      </h1>
      <p class="text-sm text-muted-foreground">
        Headless TanStack Table + наша разметка: сортировка, выбор строк,
        bulk-действия, пагинация, плотность и состояния.
      </p>
    </header>

    <!-- Демо-переключатели -->
    <div class="flex flex-wrap items-center gap-2">
      <Button
        v-for="m in modes"
        :key="m.key"
        size="xs"
        :variant="mode === m.key ? 'brand' : 'outlined'"
        @click="mode = m.key"
      >
        {{ m.label }}
      </Button>
      <div class="mx-2 h-5 w-px bg-border" />
      <Button
        size="xs"
        :variant="density === 'comfortable' ? 'tonal' : 'outlined'"
        @click="density = 'comfortable'"
      >
        Comfortable
      </Button>
      <Button
        size="xs"
        :variant="density === 'compact' ? 'tonal' : 'outlined'"
        @click="density = 'compact'"
      >
        Compact
      </Button>
    </div>

    <DataTable
      :columns="columns"
      :data="rows"
      :density="density"
      enable-pagination
      enable-selection
      :error="mode === 'error'"
      :get-row-id="r => r.id"
      :loading="isLoading"
      :page-size="10"
      search-placeholder="Поиск по имени, e-mail…"
      searchable
      @retry="mode = 'data'"
      @selection-change="selected = $event"
    >
      <template #toolbar="{ table }">
        <select
          aria-label="Фильтр по статусу"
          class="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :value="(table.getColumn('status')?.getFilterValue() as string) ?? ''"
          @change="table.getColumn('status')?.setFilterValue(($event.target as HTMLSelectElement).value || undefined)"
        >
          <option value="">Все статусы</option>
          <option value="active">Активен</option>
          <option value="invited">Приглашён</option>
          <option value="blocked">Заблокирован</option>
        </select>
      </template>

      <template #bulk-actions>
        <Button size="xs" variant="outlined">
          <template #prepend>
            <Icon name="mdi-content-copy" size="sm" />
          </template>
          Экспорт
        </Button>
        <Button size="xs" variant="destructive">
          <template #prepend>
            <Icon name="mdi-delete" size="sm" />
          </template>
          Удалить
        </Button>
      </template>
    </DataTable>

    <p v-if="selected.length > 0" class="text-xs text-muted-foreground">
      Выбранные id: {{ selected.map(u => u.id).join(', ') }}
    </p>
    <p v-if="lastAction" class="text-xs text-muted-foreground">
      Последнее действие: <span class="text-foreground">{{ lastAction }}</span>
    </p>
  </div>
</template>
