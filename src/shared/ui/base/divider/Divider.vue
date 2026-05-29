<script setup lang="ts">
/**
 * shadcn-vue реализация Divider'а: тонкая обёртка над reka-ui Separator
 * (адаптирована из `npx shadcn-vue add separator`).
 *
 * Маппинг API: наш `vertical?: boolean` → reka-ui `orientation`.
 * Цвет берётся из design token --color-border (Tailwind utility bg-border).
 */
  import { Separator } from 'reka-ui'

  const props = withDefaults(defineProps<{
    vertical?: boolean
  }>(), { vertical: false })

  const orientation = computed(() => (props.vertical ? 'vertical' : 'horizontal'))
</script>

<template>
  <Separator
    :class="vertical ? 'w-px h-full shrink-0 bg-border' : 'h-px w-full shrink-0 bg-border'"
    decorative
    :orientation="orientation"
  />
</template>
