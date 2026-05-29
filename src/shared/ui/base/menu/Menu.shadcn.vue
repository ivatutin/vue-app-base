<script setup lang="ts">
/**
 * shadcn-vue реализация Menu — на reka-ui Popover (generic dropdown).
 *
 * Контракт сохранён: scoped slot activator с `props` (для совместимости
 * с vuetify-версией; для reka-ui props не нужны, PopoverTrigger
 * прокидывает event handlers через as-child автоматически — но мы
 * отдаём пустой объект, чтобы потребитель v-bind="props" не падал).
 *
 * closeOnContentClick → wrap default slot в `@click="open=false"`.
 * Полноценное menu (focus trap, keyboard arrow navigation) — в
 * Фазе 2.8 будущая обёртка <DropdownMenu> на reka-ui Menu primitive.
 *
 * Токены: bg-surface (вместо shadcn-default bg-popover, у нас нет),
 * text-surface-foreground.
 */
  import {
    PopoverContent,
    PopoverPortal,
    PopoverRoot,
    PopoverTrigger,
  } from 'reka-ui'

  type Location
    = | 'top'
      | 'bottom'
      | 'start'
      | 'end'
      | 'top start'
      | 'top end'
      | 'bottom start'
      | 'bottom end'

  const props = withDefaults(defineProps<{
    closeOnContentClick?: boolean
    location?: Location
  }>(), {
    closeOnContentClick: true,
    location: 'bottom',
  })

  const open = ref(false)

  // 'top start' / 'bottom end' / ... → reka-ui side + align
  const sideAlign = computed(() => {
    const [side, align] = props.location.split(' ')
    const sideMap: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
      top: 'top',
      bottom: 'bottom',
      start: 'left',
      end: 'right',
    }
    return {
      side: sideMap[side!] ?? 'bottom',
      align: (align as 'start' | 'end' | 'center' | undefined) ?? 'center',
    }
  })

  function handleContentClick () {
    if (props.closeOnContentClick) open.value = false
  }
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <slot name="activator" :props="{}" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :align="sideAlign.align"
        class="z-[3000] min-w-[12rem] rounded-md border bg-surface text-surface-foreground p-1 shadow-md outline-none"
        :side="sideAlign.side"
        :side-offset="4"
        @click="handleContentClick"
      >
        <slot />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
