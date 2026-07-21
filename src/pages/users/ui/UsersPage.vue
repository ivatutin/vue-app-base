<script setup lang="ts">
/**
 * Раздел управления пользователями.
 *
 * Пока заглушка, но маршрут **защищён по-настоящему**: `meta.permissions`
 * проверяет router-guard. До этого RBAC держался только на скрытых
 * пунктах сайдбара, то есть прямой ввод URL обходил его целиком —
 * классическая «защита сокрытием ссылки».
 *
 * Право должно совпадать с `permission` соответствующего пункта в
 * [sidebar-items.ts](../../../widgets/app-sidebar/model/sidebar-items.ts);
 * расхождение ловит тест `sidebar-permissions.test.ts`.
 */
  import { EmptyState, PageHeader } from '@/shared/ui/base'

  definePage({
    meta: {
      title: 'Пользователи',
      permissions: ['user.read'],
    },
  })
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      description="Список пользователей, роли и доступы."
      title="Пользователи"
    />
    <EmptyState
      description="Раздел в разработке. Здесь появится таблица пользователей с фильтрами и массовыми действиями."
      icon="mdi-account"
      title="Скоро"
    />
  </div>
</template>
