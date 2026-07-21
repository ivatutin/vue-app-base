<script setup lang="ts">
/**
 * Раздел управления ролями.
 *
 * Заглушка с настоящей защитой маршрута: `role.manage` проверяет
 * router-guard, а не только фильтр сайдбара. См. комментарий
 * в [UsersPage.vue](../../users/ui/UsersPage.vue).
 */
  import { EmptyState, PageHeader } from '@/shared/ui/base'

  definePage({
    meta: {
      title: 'Роли',
      permissions: ['role.manage'],
    },
  })
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      description="Роли и наборы прав, которые они дают."
      title="Роли"
    />
    <EmptyState
      description="Раздел в разработке. Здесь появится редактор ролей и матрица прав."
      icon="mdi-shield"
      title="Скоро"
    />
  </div>
</template>
