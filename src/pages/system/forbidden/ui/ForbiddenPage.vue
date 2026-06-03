<script setup lang="ts">
  import { Button, EmptyState } from '@/shared/ui/base'

  definePage({
    meta: {
      title: 'Доступ запрещён',
      noAuth: true,
    },
  })
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <EmptyState
      description="У вас нет прав для просмотра этой страницы. Обратитесь к администратору, если это ошибка."
      icon="mdi-lock"
      title="403 · Доступ запрещён"
    >
      <Button variant="primary" @click="$router.replace({ name: '/dashboard' })">
        На главную
      </Button>
    </EmptyState>
  </div>
</template>
