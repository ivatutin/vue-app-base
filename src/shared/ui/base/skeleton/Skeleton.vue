<script setup lang="ts">
/**
 * Skeleton — плейсхолдер загрузки. Анимированный пульсирующий блок на
 * --color-muted. Размер задаётся через class потребителя (h-4 w-32 и т.п.),
 * cn() разрешает конфликты Tailwind.
 *
 * Используется вместо спиннеров для контента с известной структурой
 * (карточки, строки таблиц, текст) — снижает воспринимаемую задержку.
 */
  import type { HTMLAttributes } from 'vue'
  import { cn } from '@/shared/lib/utils/cn'

  const props = defineProps<{
    class?: HTMLAttributes['class']
  }>()
</script>

<template>
  <div
    aria-hidden="true"
    :class="cn('animate-pulse rounded-md bg-muted', props.class)"
  />
</template>
