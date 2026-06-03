<script setup lang="ts">
  import { Button, Card, EmptyState, Icon, PageHeader, Skeleton } from '@/shared/ui/base'

  definePage({
    meta: {
      title: 'Dashboard',
    },
  })

  type Trend = 'up' | 'down'
  type Metric = { label: string, value: string, delta: string, trend: Trend }

  const metrics: Metric[] = [
    { label: 'Активные пользователи', value: '1 284', delta: '+12,5%', trend: 'up' },
    { label: 'Новые за неделю', value: '320', delta: '+4,1%', trend: 'up' },
    { label: 'Конверсия', value: '3,8%', delta: '−0,6%', trend: 'down' },
    { label: 'Активные сессии', value: '47', delta: '+8', trend: 'up' },
  ]

  type Activity = { id: number, who: string, action: string, when: string }

  const activity: Activity[] = [
    { id: 1, who: 'Анна Петрова', action: 'обновила профиль', when: '5 мин назад' },
    { id: 2, who: 'Иван Сидоров', action: 'создал роль «Аудитор»', when: '32 мин назад' },
    { id: 3, who: 'Система', action: 'выполнила бэкап', when: '1 ч назад' },
    { id: 4, who: 'Ольга Кузнецова', action: 'вошла в систему', when: '2 ч назад' },
  ]

  // Имитация загрузки серверных данных — демонстрирует skeleton → content.
  const loading = ref(true)

  function load () {
    loading.value = true
    setTimeout(() => (loading.value = false), 1000)
  }

  onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <PageHeader
      description="Обзор ключевых показателей и последней активности."
      title="Dashboard"
    >
      <template #actions>
        <Button :loading="loading" variant="text" @click="load">
          <template #prepend>
            <Icon name="mdi-refresh" size="sm" />
          </template>
          Обновить
        </Button>
        <Button variant="primary">
          <template #prepend>
            <Icon name="mdi-plus" size="sm" />
          </template>
          Создать отчёт
        </Button>
      </template>
    </PageHeader>

    <!-- Метрики -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card v-for="metric in metrics" :key="metric.label">
        <template v-if="loading">
          <Skeleton class="h-4 w-28" />
          <Skeleton class="mt-3 h-8 w-20" />
          <Skeleton class="mt-2 h-3 w-16" />
        </template>
        <template v-else>
          <p class="text-sm text-muted-foreground">
            {{ metric.label }}
          </p>
          <p class="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {{ metric.value }}
          </p>
          <p
            class="mt-1 flex items-center gap-1 text-xs font-medium"
            :class="metric.trend === 'up' ? 'text-success' : 'text-error'"
          >
            <Icon
              :name="metric.trend === 'up' ? 'mdi-trending-up' : 'mdi-trending-down'"
              size="sm"
            />
            {{ metric.delta }}
          </p>
        </template>
      </Card>
    </div>

    <!-- Контент: активность + уведомления -->
    <div class="grid gap-4 lg:grid-cols-3">
      <Card class="lg:col-span-2" title="Последние действия">
        <!-- loading -->
        <div v-if="loading" class="space-y-4">
          <div v-for="n in 4" :key="n" class="flex items-center gap-3">
            <Skeleton class="size-9 rounded-full" />
            <div class="flex-1 space-y-1.5">
              <Skeleton class="h-3.5 w-2/3" />
              <Skeleton class="h-3 w-1/4" />
            </div>
          </div>
        </div>
        <!-- data -->
        <ul v-else class="divide-y">
          <li
            v-for="item in activity"
            :key="item.id"
            class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div class="grid place-items-center size-9 shrink-0 rounded-full bg-brand/10 text-brand">
              <Icon name="mdi-account" size="sm" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm">
                <span class="font-medium">{{ item.who }}</span>
                <span class="text-muted-foreground"> {{ item.action }}</span>
              </p>
            </div>
            <span class="shrink-0 text-xs text-muted-foreground">{{ item.when }}</span>
          </li>
        </ul>
      </Card>

      <Card title="Уведомления">
        <div v-if="loading" class="space-y-3 py-2">
          <Skeleton class="h-3.5 w-full" />
          <Skeleton class="h-3.5 w-5/6" />
          <Skeleton class="h-3.5 w-4/6" />
        </div>
        <EmptyState
          v-else
          description="Новые уведомления появятся здесь, как только что-то произойдёт."
          icon="mdi-inbox"
          title="Пока пусто"
        >
          <Button size="sm" variant="secondary">
            Настроить уведомления
          </Button>
        </EmptyState>
      </Card>
    </div>
  </div>
</template>
