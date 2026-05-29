<script setup lang="ts">
/**
 * shadcn-vue реализация Alert. Адаптирован под наш API:
 * - kind: 'info' | 'success' | 'warning' | 'error' (наш domain enum)
 * - variant: 'tonal' | 'outlined' | 'flat' (визуальные стили)
 * - density: 'compact' | 'default'
 * - closable + close emit
 *
 * Дизайн-токены: --color-info/success/warning/error + foreground'ы
 * через Tailwind v4 @theme.
 */
  import { X } from '@lucide/vue'
  import { cva } from 'class-variance-authority'

  type Kind = 'info' | 'success' | 'warning' | 'error'

  withDefaults(defineProps<{
    kind?: Kind
    variant?: 'tonal' | 'outlined' | 'flat'
    density?: 'compact' | 'default'
    closable?: boolean
  }>(), {
    kind: 'info',
    variant: 'tonal',
    density: 'default',
    closable: false,
  })

  defineEmits<{ close: [] }>()

  const alertClass = cva(
    'relative w-full rounded-md flex items-start gap-3',
    {
      variants: {
        kind: {
          info: '',
          success: '',
          warning: '',
          error: '',
        },
        variant: {
          tonal: '',
          outlined: 'border bg-transparent',
          flat: '',
        },
        density: {
          compact: 'px-3 py-2 text-sm',
          default: 'px-4 py-3 text-sm',
        },
      },
      compoundVariants: [
        // tonal: подкрашенный фон + текст в семантическом цвете
        { kind: 'info', variant: 'tonal', class: 'bg-info/10 text-info' },
        { kind: 'success', variant: 'tonal', class: 'bg-success/10 text-success' },
        { kind: 'warning', variant: 'tonal', class: 'bg-warning/10 text-warning' },
        { kind: 'error', variant: 'tonal', class: 'bg-error/10 text-error' },
        // flat: фон + контрастный foreground (для важных сообщений)
        { kind: 'info', variant: 'flat', class: 'bg-info text-info-foreground' },
        { kind: 'success', variant: 'flat', class: 'bg-success text-success-foreground' },
        { kind: 'warning', variant: 'flat', class: 'bg-warning text-warning-foreground' },
        { kind: 'error', variant: 'flat', class: 'bg-error text-error-foreground' },
        // outlined: только border в семантическом цвете
        { kind: 'info', variant: 'outlined', class: 'border-info text-info' },
        { kind: 'success', variant: 'outlined', class: 'border-success text-success' },
        { kind: 'warning', variant: 'outlined', class: 'border-warning text-warning' },
        { kind: 'error', variant: 'outlined', class: 'border-error text-error' },
      ],
    },
  )
</script>

<template>
  <div
    :class="alertClass({ kind, variant, density })"
    role="alert"
  >
    <div class="flex-1">
      <slot />
    </div>
    <button
      v-if="closable"
      aria-label="Закрыть"
      class="shrink-0 -mr-1 rounded p-1 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      type="button"
      @click="$emit('close')"
    >
      <X :size="16" />
    </button>
  </div>
</template>
