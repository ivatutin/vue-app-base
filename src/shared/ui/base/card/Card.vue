<script setup lang="ts">
/**
 * shadcn-vue реализация Card — composite на собственном <div> +
 * Tailwind. Структура соответствует vuetify-версии: header (slot или
 * title prop), body (default slot), footer (slot с border-top вместо
 * v-divider).
 *
 * Дизайн-токены: --color-surface / --color-surface-foreground (карта
 * лежит на surface поверх background), --color-border.
 *
 * sub-parts (CardHeader/CardContent/CardFooter из shadcn-vue add card)
 * удалены — они не использовались. При необходимости advanced layout
 * генерятся повторно через CLI.
 */
  import { cn } from '@/shared/lib/utils/cn'

  defineProps<{
    width?: string | number
    title?: string
  }>()

  const slots = defineSlots<{
    header?: () => unknown
    default?: () => unknown
    footer?: () => unknown
  }>()
</script>

<template>
  <div
    class="rounded border bg-surface text-surface-foreground shadow-sm flex flex-col"
    :style="width ? { width: typeof width === 'number' ? `${width}px` : width } : undefined"
  >
    <div v-if="slots.header || title" class="p-6">
      <slot name="header">
        <h3 class="text-xl font-semibold leading-tight">
          {{ title }}
        </h3>
      </slot>
    </div>
    <div
      v-if="slots.default"
      :class="cn('p-6', (slots.header || title) && 'pt-0')"
    >
      <slot />
    </div>
    <div
      v-if="slots.footer"
      class="flex items-center gap-2 border-t px-6 py-4"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
