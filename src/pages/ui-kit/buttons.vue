<script setup lang="ts">
  import { Button, Card, Divider, Icon } from '@/shared/ui/base'

  definePage({
    meta: { title: 'Buttons' },
  })

  const loading = ref(false)

  function fakeSubmit () {
    loading.value = true
    setTimeout(() => (loading.value = false), 1200)
  }

  const variants = ['primary', 'brand', 'secondary', 'tonal', 'outlined', 'text', 'destructive'] as const
  const sizes = ['xs', 'sm', 'md', 'lg'] as const
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-8">
    <!-- Page header -->
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">
        UI Kit · Buttons
      </h1>
      <p class="text-sm text-muted-foreground">
        Варианты, размеры, состояния и иконки. Наведите/нажмите — у кнопок есть
        hover- и press-состояния (<code>active:</code>).
      </p>
    </header>

    <!-- ===== Варианты ===== -->
    <Card title="Варианты">
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <Button v-for="v in variants" :key="v" :variant="v">
            {{ v }}
          </Button>
        </div>
        <p class="text-xs text-muted-foreground">
          <code>primary</code> — нейтральный (zinc), для вторичных действий.
          <code>brand</code> — акцентный emerald для главного CTA экрана (один на экран).
        </p>
      </div>
    </Card>

    <!-- ===== Размеры ===== -->
    <Card title="Размеры">
      <div class="space-y-6">
        <section class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Текст
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <Button v-for="s in sizes" :key="s" :size="s" variant="brand">
              Size {{ s }}
            </Button>
          </div>
        </section>

        <Divider />

        <section class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            С иконкой
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <Button v-for="s in sizes" :key="s" :size="s" variant="secondary">
              <template #prepend>
                <Icon name="mdi-plus" :size="s === 'lg' ? 'md' : 'sm'" />
              </template>
              Создать
            </Button>
          </div>
        </section>

        <Divider />

        <section class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Icon-only (квадратные)
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <Button
              v-for="s in sizes"
              :key="s"
              icon="mdi-content-save"
              :size="s"
              title="Сохранить"
              variant="tonal"
            />
          </div>
        </section>
      </div>
    </Card>

    <!-- ===== Состояния ===== -->
    <Card title="Состояния">
      <div class="space-y-6">
        <section class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Loading и disabled
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <Button :loading="loading" variant="brand" @click="fakeSubmit">
              {{ loading ? 'Сохранение…' : 'Сохранить' }}
            </Button>
            <Button disabled variant="brand">
              Disabled
            </Button>
            <Button
              icon="mdi-refresh"
              :loading="loading"
              title="Обновить"
              variant="secondary"
              @click="fakeSubmit"
            />
          </div>
        </section>

        <Divider />

        <section class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Block (на всю ширину)
          </p>
          <Button block variant="brand">
            <template #prepend>
              <Icon name="mdi-exit-run" size="sm" />
            </template>
            Войти
          </Button>
        </section>
      </div>
    </Card>

    <!-- ===== Матрица вариант × размер ===== -->
    <Card title="Матрица · вариант × размер">
      <div class="space-y-4">
        <div v-for="v in variants" :key="v" class="flex flex-wrap items-center gap-3">
          <span class="w-24 shrink-0 text-xs font-medium text-muted-foreground">{{ v }}</span>
          <Button v-for="s in sizes" :key="s" :size="s" :variant="v">
            {{ s }}
          </Button>
        </div>
      </div>
    </Card>
  </div>
</template>
