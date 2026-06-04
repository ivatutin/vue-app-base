<script setup lang="ts">
/**
 * RowActions — «⋯»-меню действий строки таблицы (на нашем Menu + List).
 * Декларативный список действий; danger-пункты красные, dividerBefore
 * вставляет разделитель (обычно перед деструктивной группой).
 *
 * Импорты — относительные (а не через barrel @/shared/ui/base): компонент
 * сам живёт в base, иначе циклическая зависимость.
 */
  import type { RowAction } from './types'
  import Button from '../button/Button.vue'
  import Divider from '../divider/Divider.vue'
  import { List, ListItem } from '../list'
  import Menu from '../menu/Menu.vue'

  withDefaults(defineProps<{
    actions: RowAction[]
    label?: string
  }>(), {
    label: 'Действия',
  })
</script>

<template>
  <Menu location="bottom end">
    <template #activator="{ props }">
      <Button
        v-bind="props"
        icon="mdi-dots-vertical"
        size="xs"
        :title="label"
        variant="text"
      />
    </template>
    <List density="compact">
      <template v-for="(a, i) in actions" :key="i">
        <Divider v-if="a.dividerBefore" />
        <ListItem
          :danger="a.danger"
          :disabled="a.disabled"
          :icon="a.icon"
          :title="a.label"
          @click="a.onClick()"
        />
      </template>
    </List>
  </Menu>
</template>
