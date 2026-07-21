<script setup lang="ts">
/**
 * shadcn-vue реализация Button — на reka-ui Primitive + CVA-варианты.
 *
 * Адаптирован под наш проектный API:
 * - variant: 'primary' | 'brand' | 'secondary' | 'tonal' | 'outlined' | 'text' | 'destructive'
 * - size: 'xs' | 'sm' | 'md' | 'lg'
 * - loading | disabled | block | type | icon
 *
 * Дизайн-токены: bg-primary/secondary/error + foreground'ы из
 * src/shared/assets/tokens/colors.css (Tailwind v4 @theme).
 *
 * Loading-состояние: Loader2 lucide иконка с animate-spin вместо
 * контента (disabled на кнопке параллельно). Icon-only: рендерим
 * <Icon> из shared/ui/base, скрываем default slot.
 */
  import type { RouteLocationRaw } from 'vue-router'
  import { Loader2 } from '@lucide/vue'
  import { cva } from 'class-variance-authority'
  import { Primitive } from 'reka-ui'
  import { RouterLink } from 'vue-router'
  import { cn } from '@/shared/lib/utils/cn'
  import Icon from '../icon/Icon.vue'

  type Variant = 'primary' | 'brand' | 'secondary' | 'tonal' | 'outlined' | 'text' | 'destructive'
  type Size = 'xs' | 'sm' | 'md' | 'lg'

  const props = withDefaults(defineProps<{
    variant?: Variant
    size?: Size
    loading?: boolean
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit' | 'reset'
    icon?: string
    /**
     * Навигация: с `to` рендерится RouterLink, а не button.
     * Кнопка, которая ведёт на другой экран, обязана быть ссылкой —
     * иначе теряются Ctrl+клик, «открыть в новой вкладке» и адрес
     * для скринридера. Обработчик `@click` при этом продолжает работать.
     */
    to?: RouteLocationRaw
  }>(), {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    block: false,
    type: 'button',
    icon: undefined,
    to: undefined,
  })

  defineEmits<{ click: [event: MouseEvent] }>()

  const isLink = computed(() => props.to !== undefined)

  /**
   * Атрибуты собираются по тегу. Передавать `disabled`/`type` в
   * RouterLink нельзя: на `<a>` они бессмысленны, а явный `undefined`
   * в fallthrough-атрибутах затирает собственные props компонента —
   * ровно так `ListItem` терял `href` (см. ListItem.test.ts).
   */
  const tagAttrs = computed(() => (isLink.value
    ? { to: props.to }
    : { type: props.type, disabled: props.disabled || props.loading }))

  const BASE_CLASS = [
    'inline-flex items-center justify-center whitespace-nowrap cursor-pointer select-none',
    'rounded-md text-sm font-medium ring-offset-background transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'focus-visible:ring-offset-2 disabled:pointer-events-none',
    'disabled:opacity-50',
  ].join(' ')

  const buttonVariants = cva(BASE_CLASS, {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
        brand: 'bg-brand text-brand-foreground hover:bg-brand/90 active:bg-brand/80',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70',
        tonal: 'bg-primary/10 text-primary hover:bg-primary/15 active:bg-primary/20',
        outlined: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground active:bg-accent/70',
        text: 'hover:bg-accent hover:text-accent-foreground active:bg-accent/70',
        destructive: 'bg-error text-error-foreground hover:bg-error/90 active:bg-error/80',
      },
      size: {
        xs: 'h-6 gap-1.5 px-2.5 text-xs',
        sm: 'h-8 gap-1.5 px-3',
        md: 'h-9 gap-2 px-4',
        lg: 'h-10 gap-2 px-8',
      },
      iconOnly: {
        true: '!px-0',
        false: '',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
  },
  )

  const iconOnly = computed(() => Boolean(props.icon))

  const iconOnlySquare = computed(() => {
    if (!iconOnly.value) return ''
    return {
      xs: '!w-6',
      sm: '!w-8',
      md: '!w-9',
      lg: '!w-10',
    }[props.size]
  })

  const SIZE_TO_ICON = { xs: 'xs', sm: 'xs', md: 'sm', lg: 'md' } as const
  const innerIconSize = computed<'xs' | 'sm' | 'md'>(() => SIZE_TO_ICON[props.size])
</script>

<template>
  <Primitive
    :aria-busy="loading || undefined"
    :aria-disabled="isLink && disabled ? true : undefined"
    :as="isLink ? RouterLink : 'button'"
    v-bind="tagAttrs"
    :class="cn(
      buttonVariants({ variant, size, iconOnly, block }),
      iconOnlySquare,
      isLink && disabled && 'pointer-events-none opacity-50',
    )"
    @click="$emit('click', $event)"
  >
    <Loader2 v-if="loading" class="animate-spin" :size="innerIconSize === 'md' ? 20 : 16" />
    <template v-else-if="iconOnly">
      <Icon :name="icon!" :size="innerIconSize" />
    </template>
    <template v-else>
      <slot name="prepend" />
      <slot />
      <slot name="append" />
    </template>
  </Primitive>
</template>
