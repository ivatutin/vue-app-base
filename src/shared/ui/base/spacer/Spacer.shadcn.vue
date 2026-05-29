<script setup lang="ts">
/**
 * shadcn-vue реализация Spacer'а — растягивается во flex-контейнере,
 * заполняя свободное пространство.
 *
 * Использует Tailwind utility flex-1 (= flex: 1 1 0%). `min-w-0`/`min-h-0`
 * не добавляем — у Spacer'а нет children, overflow невозможен.
 */
</script>

<template>
  <div aria-hidden="true" class="flex-1" />
</template>
