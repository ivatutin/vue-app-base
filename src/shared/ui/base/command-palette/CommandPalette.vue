<script setup lang="ts">
  import type { CommandGroup, CommandItem } from './types'
  /**
 * CommandPalette — generic командная палитра (cmdk-паттерн) на reka-ui
 * Dialog + Listbox. Презентационный компонент: получает группы команд и
 * эмитит `select` — действие выполняет потребитель (widgets/app-command-palette).
 *
 * Фильтрация — собственная (по label + keywords), чтобы предсказуемо
 * управлять empty-состоянием. ListboxFilter служит полем ввода и
 * маршрутизирует клавиатуру (↑/↓/↵) в Listbox; ListboxRoot даёт
 * подсветку и выбор по Enter.
 *
 * a11y: Dialog даёт focus-trap, Esc и overlay; DialogTitle/Description
 * скрыты визуально (sr-only), но доступны скринридерам.
 */
  import {
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,
    ListboxContent,
    ListboxFilter,
    ListboxGroup,
    ListboxGroupLabel,
    ListboxItem,
    ListboxRoot,
  } from 'reka-ui'
  import EmptyState from '../empty-state/EmptyState.vue'
  import Icon from '../icon/Icon.vue'

  const props = defineProps<{
    open: boolean
    groups: CommandGroup[]
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    'select': [item: CommandItem]
  }>()

  const search = ref('')

  // Сброс запроса при каждом открытии.
  watch(() => props.open, isOpen => {
    if (isOpen) search.value = ''
  })

  function matches (item: CommandItem, query: string): boolean {
    const haystack = [item.label, ...(item.keywords ?? [])].join(' ').toLowerCase()
    return haystack.includes(query)
  }

  const filteredGroups = computed<CommandGroup[]>(() => {
    const query = search.value.trim().toLowerCase()
    if (!query) return props.groups
    return props.groups
      .map(group => ({ ...group, items: group.items.filter(item => matches(item, query)) }))
      .filter(group => group.items.length > 0)
  })

  const totalCount = computed(() =>
    filteredGroups.value.reduce((sum, group) => sum + group.items.length, 0),
  )
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[1050] bg-black/50" />
      <DialogContent
        class="fixed left-1/2 top-[12vh] z-[1050] w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-surface text-surface-foreground shadow-xl focus:outline-none"
      >
        <DialogTitle class="sr-only">
          Командная палитра
        </DialogTitle>
        <DialogDescription class="sr-only">
          Поиск по командам и навигации
        </DialogDescription>

        <ListboxRoot highlight-on-hover selection-behavior="replace">
          <!-- Поле поиска -->
          <div class="flex items-center gap-2 border-b px-3">
            <Icon class="text-muted-foreground shrink-0" name="mdi-magnify" size="sm" />
            <ListboxFilter
              v-model="search"
              auto-focus
              class="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Введите команду или поиск…"
            />
          </div>

          <!-- Результаты -->
          <ListboxContent class="max-h-[60vh] overflow-y-auto p-2">
            <template v-if="totalCount > 0">
              <ListboxGroup
                v-for="(group, index) in filteredGroups"
                :key="group.label ?? index"
                class="mb-1 last:mb-0"
              >
                <ListboxGroupLabel
                  v-if="group.label"
                  class="px-2 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {{ group.label }}
                </ListboxGroupLabel>
                <ListboxItem
                  v-for="item in group.items"
                  :key="item.id"
                  class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                  :value="item.id"
                  @select="emit('select', item)"
                >
                  <Icon v-if="item.icon" class="text-muted-foreground shrink-0" :name="item.icon" size="sm" />
                  <span class="flex-1 truncate">{{ item.label }}</span>
                  <kbd v-if="item.hint" class="text-xs text-muted-foreground">{{ item.hint }}</kbd>
                </ListboxItem>
              </ListboxGroup>
            </template>

            <EmptyState
              v-else
              icon="mdi-magnify"
              :title="`Ничего не найдено по запросу «${search}»`"
            />
          </ListboxContent>

          <!-- Подсказки по клавишам -->
          <div class="flex items-center gap-4 border-t px-3 py-2 text-xs text-muted-foreground">
            <span class="flex items-center gap-1">
              <kbd class="rounded border bg-background px-1.5 py-0.5">↑</kbd>
              <kbd class="rounded border bg-background px-1.5 py-0.5">↓</kbd>
              навигация
            </span>
            <span class="flex items-center gap-1">
              <kbd class="rounded border bg-background px-1.5 py-0.5">↵</kbd>
              выбрать
            </span>
            <span class="flex items-center gap-1">
              <kbd class="rounded border bg-background px-1.5 py-0.5">esc</kbd>
              закрыть
            </span>
          </div>
        </ListboxRoot>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
