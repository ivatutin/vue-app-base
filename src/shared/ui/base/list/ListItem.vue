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
 * Иконка слева через shared/ui/base/icon (MDI_TO_LUCIDE словарь).
 *
 * router-link active-классы (`router-link-active`,
 * `router-link-exact-active`) автоматически подкрашивают item, когда
 * текущий маршрут совпадает. Дополнительно поддержан явный prop active.
 */
  import type { RouteLocationRaw } from 'vue-router'
  import { cn } from '@/shared/lib/utils/cn'
  import Icon from '../icon/Icon.vue'

  const props = withDefaults(defineProps<{
    icon?: string
    title?: string
    to?: RouteLocationRaw
    href?: string
    active?: boolean
    disabled?: boolean
    danger?: boolean
  }>(), {
    icon: undefined,
    title: undefined,
    to: undefined,
    href: undefined,
    active: false,
    disabled: false,
    danger: false,
  })

  defineEmits<{ click: [event: MouseEvent | KeyboardEvent] }>()

  const tag = computed(() => {
    if (props.to !== undefined) return 'RouterLink'
    if (props.href !== undefined) return 'a'
    return 'button'
  })

  /**
   * Атрибуты собираются по тегу, а не биндятся все сразу с `undefined`
   * для неподходящих.
   *
   * Раньше на `RouterLink` уходил явный `:href="undefined"`, и это
   * **стирало href, который RouterLink проставляет сам**: fallthrough-
   * атрибуты применяются поверх собственных props корневого элемента.
   * Клик продолжал работать (обработчик на месте), поэтому баг не
   * замечали — но ссылка теряла адрес: Ctrl+клик, «открыть в новой
   * вкладке», «копировать адрес» и скринридер переставали работать.
   */
  const tagAttrs = computed(() => {
    switch (tag.value) {
      case 'RouterLink': {
        return { to: props.to }
      }
      case 'a': {
        return { href: props.href }
      }
      default: {
        return { type: 'button' as const, disabled: props.disabled }
      }
    }
  })

  const itemClass = computed(() => cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    props.danger ? 'text-error' : 'text-foreground',
    !props.disabled && (props.danger
      ? 'hover:bg-error/10 hover:text-error'
      : [
        'hover:bg-accent hover:text-accent-foreground',
        'router-link-exact-active:bg-accent router-link-exact-active:text-accent-foreground',
      ]),
    props.active && 'bg-accent text-accent-foreground',
    props.disabled && 'opacity-50 pointer-events-none',
  ))
</script>

<template>
  <component
    :is="tag"
    v-bind="tagAttrs"
    :class="itemClass"
    @click="$emit('click', $event)"
  >
    <Icon v-if="icon" :name="icon" size="sm" />
    <span v-if="title" class="flex-1 truncate">{{ title }}</span>
    <slot />
  </component>
</template>
