<script setup lang="ts">
/**
 * EmptyState — единый паттерн для «пусто / нет данных / ошибка доступа».
 * Иконка в кружке + заголовок + описание + слот для действий (CTA).
 *
 * Смысл передаётся не только иконкой: заголовок и описание обязательны
 * текстом (a11y — не полагаемся на цвет/иконку).
 *
 * Используется на пустых списках, а также страницами 403/404.
 */
  import Icon from '../icon/Icon.vue'

  defineProps<{
    icon?: string
    title: string
    description?: string
  }>()

  const slots = defineSlots<{
    default?: () => unknown
  }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
    <div
      v-if="icon"
      class="grid place-items-center size-12 rounded-full bg-muted text-muted-foreground"
    >
      <Icon :name="icon" size="md" />
    </div>
    <div class="space-y-1">
      <h3 class="text-base font-semibold">
        {{ title }}
      </h3>
      <p v-if="description" class="mx-auto max-w-sm text-sm text-muted-foreground">
        {{ description }}
      </p>
    </div>
    <div v-if="slots.default" class="pt-2">
      <slot />
    </div>
  </div>
</template>
