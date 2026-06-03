<script setup lang="ts">
  import { Alert, Button, Card, Divider, Form, Spacer, TextField } from '@/shared/ui/base'

  definePage({
    meta: { title: 'Card' },
  })

  // --- демо-состояния формы ---
  const name = ref('')
  const email = ref('')
  const password = ref('')
  const withError = ref('user@')
  const loading = ref(false)

  function fakeSubmit () {
    loading.value = true
    setTimeout(() => (loading.value = false), 1200)
  }
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-8">
    <!-- Page header -->
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">
        UI Kit · Card
      </h1>
      <p class="text-sm text-muted-foreground">
        Примеры базовых компонентов: Card, Button, TextField/Input и Form.
      </p>
    </header>

    <!-- ===== Buttons ===== -->
    <Card title="Buttons">
      <div class="space-y-6">
        <section class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Варианты
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <Button variant="primary">
              Primary
            </Button>
            <Button variant="secondary">
              Secondary
            </Button>
            <Button variant="tonal">
              Tonal
            </Button>
            <Button variant="text">
              Text
            </Button>
            <Button variant="destructive">
              Destructive
            </Button>
          </div>
        </section>

        <Divider />

        <section class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Размеры
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <Button size="sm">
              Small
            </Button>
            <Button size="md">
              Medium
            </Button>
            <Button size="lg">
              Large
            </Button>
          </div>
        </section>

        <Divider />

        <section class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Состояния и иконки
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <Button :loading="loading" variant="primary" @click="fakeSubmit">
              {{ loading ? 'Загрузка…' : 'Запустить' }}
            </Button>
            <Button disabled variant="primary">
              Disabled
            </Button>
            <Button icon="mdi-content-save" title="Сохранить" variant="secondary" />
            <Button icon="mdi-pencil" title="Редактировать" variant="tonal" />
            <Button icon="mdi-delete" title="Удалить" variant="destructive" />
          </div>
          <div class="pt-2">
            <Button block variant="primary">
              Block (на всю ширину)
            </Button>
          </div>
        </section>
      </div>
    </Card>

    <!-- ===== Inputs ===== -->
    <Card title="TextField / Input">
      <div class="grid gap-5 sm:grid-cols-2">
        <TextField v-model="name" label="Имя" placeholder="Иван Иванов" />
        <TextField
          v-model="email"
          autocomplete="email"
          label="E-mail"
          placeholder="you@example.com"
          required
          type="email"
        />
        <TextField
          v-model="password"
          label="Пароль"
          placeholder="••••••••"
          type="password"
        />
        <TextField
          v-model="withError"
          error="Введите корректный e-mail"
          label="С ошибкой"
          type="email"
        />
        <TextField disabled label="Disabled" model-value="Недоступно" />
        <div class="space-y-2">
          <TextField label="Size sm" placeholder="h-9" size="sm" />
          <TextField label="Size lg" placeholder="h-11" size="lg" />
        </div>
      </div>
    </Card>

    <!-- ===== Form ===== -->
    <Card title="Form">
      <Form class="space-y-4" @submit="fakeSubmit">
        <Alert density="compact" kind="info">
          Form оборачивает поля и эмитит <code>submit</code> (preventDefault внутри).
        </Alert>
        <div class="grid gap-4 sm:grid-cols-2">
          <TextField label="Имя" placeholder="Иван" required />
          <TextField label="Фамилия" placeholder="Иванов" required />
        </div>
        <TextField label="E-mail" placeholder="you@example.com" required type="email" />
        <div class="flex items-center gap-2 pt-2">
          <Spacer />
          <Button type="button" variant="text">
            Отмена
          </Button>
          <Button :loading="loading" type="submit" variant="primary">
            Сохранить
          </Button>
        </div>
      </Form>
    </Card>

    <!-- ===== Cards ===== -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold tracking-tight">
        Card — композиции
      </h2>
      <div class="grid gap-5 md:grid-cols-3">
        <!-- title + body -->
        <Card title="С заголовком">
          Базовая карточка: <code>title</code> + контент в default-слоте.
        </Card>

        <!-- body only -->
        <Card>
          Без заголовка — только тело. Подходит для плотных списков и метрик.
        </Card>

        <!-- title + body + footer -->
        <Card title="С футером">
          Действия выносятся в footer-слот (с верхней границей).
          <template #footer>
            <Spacer />
            <Button size="sm" variant="text">
              Отмена
            </Button>
            <Button size="sm" variant="primary">
              ОК
            </Button>
          </template>
        </Card>

        <!-- custom header slot -->
        <Card>
          <template #header>
            <div class="flex items-center gap-2">
              <div class="grid place-items-center size-8 rounded-md bg-brand/10 text-brand">
                <span class="text-sm font-bold">42</span>
              </div>
              <div>
                <p class="font-semibold leading-tight">
                  Кастомный header
                </p>
                <p class="text-xs text-muted-foreground">
                  Через #header слот
                </p>
              </div>
            </div>
          </template>
          Заголовок можно полностью переопределить слотом.
        </Card>

        <!-- metric card -->
        <Card>
          <p class="text-sm text-muted-foreground">
            Активные пользователи
          </p>
          <p class="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            1 284
          </p>
          <p class="mt-1 text-xs text-success">
            +12,5% за неделю
          </p>
        </Card>

        <!-- fixed width -->
        <Card title="Фикс. ширина" :width="240">
          <code>width</code> принимает число (px) или строку.
        </Card>
      </div>
    </section>
  </div>
</template>
