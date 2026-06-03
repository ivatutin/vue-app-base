<script setup lang="ts">
/**
 * PageHeader — заголовочный блок страницы (внутри контента, не путать с
 * AppHeader/breadcrumbs). Title + опциональное описание + слот actions
 * (кнопки справа). На мобильных actions переносятся под заголовок.
 *
 * Единый паттерн шапки для всех страниц — консистентность и предсказуемое
 * расположение действий.
 */
  defineProps<{
    title: string
    description?: string
  }>()

  const slots = defineSlots<{
    actions?: () => unknown
  }>()
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-1 min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight truncate">
        {{ title }}
      </h1>
      <p v-if="description" class="text-sm text-muted-foreground">
        {{ description }}
      </p>
    </div>
    <div v-if="slots.actions" class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>
