<script setup lang="ts">
/**
 * shadcn-vue реализация Button — на reka-ui Primitive + CVA-варианты.
 *
 * Адаптирован под наш проектный API:
 * - variant: 'primary' | 'brand' | 'secondary' | 'tonal' | 'text' | 'destructive'
 * - size: 'sm' | 'md' | 'lg'
 * - loading | disabled | block | type | icon
 *
 * Дизайн-токены: bg-primary/secondary/error + foreground'ы из
 * src/shared/assets/tokens/colors.css (Tailwind v4 @theme).
 *
 * Loading-состояние: Loader2 lucide иконка с animate-spin вместо
 * контента (disabled на кнопке параллельно). Icon-only: рендерим
 * <Icon> из shared/ui/base, скрываем default slot.
 */
  import { Loader2 } from '@lucide/vue'
  import { cva } from 'class-variance-authority'
  import { Primitive } from 'reka-ui'
  import { cn } from '@/shared/lib/utils/cn'
  import Icon from '../icon/Icon.vue'

  type Variant = 'primary' | 'brand' | 'secondary' | 'tonal' | 'text' | 'destructive'
  type Size = 'sm' | 'md' | 'lg'

  const props = withDefaults(defineProps<{
    variant?: Variant
    size?: Size
    loading?: boolean
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit' | 'reset'
    icon?: string
  }>(), {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    block: false,
    type: 'button',
    icon: undefined,
  })

  defineEmits<{ click: [event: MouseEvent] }>()

  const BASE_CLASS = [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md text-sm font-medium ring-offset-background transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'focus-visible:ring-offset-2 disabled:pointer-events-none',
    'disabled:opacity-50',
  ].join(' ')

  const buttonVariants = cva(BASE_CLASS, {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        brand: 'bg-brand text-brand-foreground hover:bg-brand/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        tonal: 'bg-primary/10 text-primary hover:bg-primary/20',
        text: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-error text-error-foreground hover:bg-error/90',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 px-8',
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
      sm: '!w-9',
      md: '!w-10',
      lg: '!w-11',
    }[props.size]
  })

  const innerIconSize = computed<'sm' | 'md'>(() => (props.size === 'lg' ? 'md' : 'sm'))
</script>

<template>
  <Primitive
    as="button"
    :class="cn(
      buttonVariants({ variant, size, iconOnly, block }),
      iconOnlySquare,
    )"
    :disabled="disabled || loading"
    :type="type"
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
