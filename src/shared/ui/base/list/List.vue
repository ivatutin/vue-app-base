<script setup lang="ts">
/**
 * shadcn-vue реализация List — собственный <nav>/<ul> контейнер.
 * Нет shadcn-vue эквивалента (sidebar/command/menu лежат отдельно
 * и слишком тяжёлые) — собираем минимум сами на Tailwind.
 *
 * density: padding между items.
 * nav: семантика — <nav> снаружи, role="menu" / aria-orientation
 *   нужны на уровне Menu (radix-vue Menu primitive), здесь мы лишь
 *   контейнер.
 */
  import { cn } from '@/shared/lib/utils/cn'

  const props = withDefaults(defineProps<{
    density?: 'default' | 'compact' | 'comfortable'
    nav?: boolean
  }>(), {
    density: 'default',
    nav: false,
  })

  const densityClass = computed(() => ({
    compact: 'gap-0.5 p-1',
    default: 'gap-1 p-1.5',
    comfortable: 'gap-1.5 p-2',
  })[props.density])
</script>

<template>
  <component
    :is="nav ? 'nav' : 'div'"
    :class="cn('flex flex-col', densityClass)"
  >
    <slot />
  </component>
</template>
