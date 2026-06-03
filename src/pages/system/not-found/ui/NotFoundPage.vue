<script setup lang="ts">
  import { Button, EmptyState } from '@/shared/ui/base'

  definePage({
    name: 'not-found',
    meta: {
      title: 'Страница не найдена',
      noAuth: true,
    },
  })
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <EmptyState
      description="Возможно, страница была перемещена или удалена, либо ссылка содержит ошибку."
      icon="mdi-file-question"
      title="404 · Страница не найдена"
    >
      <Button variant="primary" @click="$router.replace({ name: '/dashboard' })">
        На главную
      </Button>
    </EmptyState>
  </div>
</template>
