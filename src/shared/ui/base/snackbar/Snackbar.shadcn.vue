<script setup lang="ts">
/**
 * shadcn-vue реализация Snackbar — карточка с auto-dismiss и close-кнопкой.
 *
 * **Не позиционирует себя.** Stacking управляет родитель (widgets/
 * app-notifications wrapper — fixed top-right + flex column). Это
 * упрощает реализацию и оставляет ему control над позицией.
 *
 * `location` prop принимается для совместимости с контрактом
 * vuetify-версии, но игнорируется в shadcn-варианте.
 *
 * Цвета: design tokens (--color-info / success / warning / error) +
 * соответствующие foreground'ы через Tailwind @theme.
 *
 * Auto-dismiss: setTimeout(timeout). -1 = без таймера. При unmount
 * таймер чистится.
 */
  import { X } from '@lucide/vue'
  import { cva } from 'class-variance-authority'

  type Kind = 'info' | 'success' | 'warning' | 'error'
  type Location
    = | 'top' | 'top right' | 'top left'
      | 'bottom' | 'bottom right' | 'bottom left'

  const props = withDefaults(defineProps<{
    kind?: Kind
    message: string
    timeout?: number
    closable?: boolean
    location?: Location
  }>(), {
    kind: 'info',
    timeout: -1,
    closable: true,
    location: 'top right',
  })

  const emit = defineEmits<{ close: [] }>()

  let timeoutId: ReturnType<typeof setTimeout> | null = null

  onMounted(() => {
    if (props.timeout > 0) {
      timeoutId = setTimeout(() => emit('close'), props.timeout)
    }
  })

  onBeforeUnmount(() => {
    if (timeoutId !== null) clearTimeout(timeoutId)
  })

  const snackClass = cva(
    'pointer-events-auto flex items-start gap-3 rounded-md p-3 pr-2 shadow-md min-w-[16rem] max-w-md',
    {
      variants: {
        kind: {
          info: 'bg-info text-info-foreground',
          success: 'bg-success text-success-foreground',
          warning: 'bg-warning text-warning-foreground',
          error: 'bg-error text-error-foreground',
        },
      },
    },
  )
</script>

<template>
  <div :class="snackClass({ kind })" role="alert">
    <div class="flex-1 text-sm pt-0.5">
      {{ message }}
    </div>
    <button
      v-if="closable"
      aria-label="Закрыть"
      class="shrink-0 rounded p-1 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      type="button"
      @click="emit('close')"
    >
      <X :size="16" />
    </button>
  </div>
</template>
