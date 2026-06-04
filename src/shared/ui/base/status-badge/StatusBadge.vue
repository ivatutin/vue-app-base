<script setup lang="ts">
/**
 * StatusBadge — пилюля статуса: цветная точка по семантике + текстовая
 * метка. Цвет НЕ единственный сигнал (a11y) — метка обязательна. Фон
 * нейтральный (bg-muted), текст читаемый в обеих темах; различает только
 * точка. Переиспользуется в таблицах, списках, карточках.
 */
  import type { HTMLAttributes } from 'vue'
  import { cn } from '@/shared/lib/utils/cn'

  type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'info'

  const props = withDefaults(defineProps<{
    label: string
    tone?: Tone
    dot?: boolean
    class?: HTMLAttributes['class']
  }>(), {
    tone: 'neutral',
    dot: true,
    class: undefined,
  })

  const DOT: Record<Tone, string> = {
    neutral: 'bg-muted-foreground',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    info: 'bg-info',
  }
</script>

<template>
  <span
    :class="cn(
      'inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground',
      props.class,
    )"
  >
    <span v-if="dot" class="size-1.5 shrink-0 rounded-full" :class="DOT[tone]" />
    {{ label }}
  </span>
</template>
