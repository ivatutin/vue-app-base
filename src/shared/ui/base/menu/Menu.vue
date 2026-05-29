<script setup lang="ts">
/**
 * Обёртка над <v-menu> (ADR-0007, Фаза 2.6).
 *
 * Контракт близок к radix-vue Popover / shadcn-vue DropdownMenu —
 * scoped slot `activator` отдаёт `props`, которые потребитель навешивает
 * на trigger-элемент (Button/Icon/..).
 *
 * После Фазы 2.7 — реализация на radix-vue Popover с тем же API.
 */
  import { VMenu } from 'vuetify/components'

  type Location
    = | 'top'
      | 'bottom'
      | 'start'
      | 'end'
      | 'top start'
      | 'top end'
      | 'bottom start'
      | 'bottom end'

  withDefaults(defineProps<{
    /** Закрывать ли меню по клику на содержимое (по умолчанию — да) */
    closeOnContentClick?: boolean
    /** Положение всплывашки относительно activator */
    location?: Location
  }>(), {
    closeOnContentClick: true,
    location: 'bottom',
  })
</script>

<template>
  <VMenu :close-on-content-click="closeOnContentClick" :location="location">
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps" />
    </template>
    <slot />
  </VMenu>
</template>
