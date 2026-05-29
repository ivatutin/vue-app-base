<script setup lang="ts">
/**
 * shadcn-vue реализация Form — тонкий <form> + prevent.submit.
 *
 * Полноценный shadcn-vue Form (с VeeValidate + Zod-resolver и
 * полем-уровневой валидацией) откладывается до Фазы 2.8 ([P2] Form
 * architecture в ROADMAP). Сейчас обёртка нужна только для submit-
 * события и единого API на местах использования.
 */
  defineEmits<{ submit: [] }>()
</script>

<template>
  <form @submit.prevent="$emit('submit')">
    <slot />
  </form>
</template>
