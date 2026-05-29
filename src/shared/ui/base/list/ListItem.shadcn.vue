<script setup lang="ts">
/**
 * shadcn-vue реализация ListItem. Tag выбирается по props:
 * - to → RouterLink
 * - href → <a>
 * - иначе → <button>
 *
 * Стилизация: hover:bg-accent, active → bg-accent text-accent-foreground,
 * disabled → opacity-50 + pointer-events-none.
 *
 * Иконка слева через Icon.shadcn.vue (MDI_TO_LUCIDE из Шага 2.7.4).
 *
 * router-link active-классы (`router-link-active`,
 * `router-link-exact-active`) автоматически подкрашивают item, когда
 * текущий маршрут совпадает. Дополнительно поддержан явный prop active.
 */
  import type { RouteLocationRaw } from 'vue-router'
  import { cn } from '@/shared/lib/utils/cn'
  import IconShadcn from '../icon/Icon.shadcn.vue'

  const props = withDefaults(defineProps<{
    icon?: string
    title?: string
    to?: RouteLocationRaw
    href?: string
    active?: boolean
    disabled?: boolean
  }>(), {
    icon: undefined,
    title: undefined,
    to: undefined,
    href: undefined,
    active: false,
    disabled: false,
  })

  defineEmits<{ click: [event: MouseEvent | KeyboardEvent] }>()

  const tag = computed(() => {
    if (props.to !== undefined) return 'RouterLink'
    if (props.href !== undefined) return 'a'
    return 'button'
  })

  const itemClass = computed(() => cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'text-foreground',
    !props.disabled && [
      'hover:bg-accent hover:text-accent-foreground',
      'router-link-exact-active:bg-accent router-link-exact-active:text-accent-foreground',
    ],
    props.active && 'bg-accent text-accent-foreground',
    props.disabled && 'opacity-50 pointer-events-none',
  ))
</script>

<template>
  <component
    :is="tag"
    :class="itemClass"
    :disabled="tag === 'button' ? disabled : undefined"
    :href="tag === 'a' ? href : undefined"
    :to="tag === 'RouterLink' ? to : undefined"
    :type="tag === 'button' ? 'button' : undefined"
    @click="$emit('click', $event)"
  >
    <IconShadcn v-if="icon" :name="icon" size="sm" />
    <span v-if="title" class="flex-1 truncate">{{ title }}</span>
    <slot />
  </component>
</template>
