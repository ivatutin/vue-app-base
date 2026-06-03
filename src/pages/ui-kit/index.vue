<script setup lang="ts">
  import { CodeViewer } from '@/shared/ui/base/code-viewer'

  const pages = [
    { label: 'Card', to: '/ui-kit/card' },
    { label: 'Buttons', to: '/ui-kit/buttons' },
    { label: 'Typography', to: '/ui-kit/typography' },
  ]
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">
        UI Kit
      </h1>
      <p class="text-sm text-muted-foreground">
        Витрина базовых компонентов дизайн-системы.
      </p>
    </header>

    <nav class="flex flex-wrap gap-2">
      <RouterLink
        v-for="page in pages"
        :key="page.to"
        class="rounded-md border px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :to="page.to"
      >
        {{ page.label }}
      </RouterLink>
    </nav>

    <CodeViewer>
      <h1>Text h1</h1>
      <h2>Text h2</h2>
      <h3>Text h3</h3>
      <h4>Text h4</h4>
      <p>Путь промысла Его<br>
        Не ведом потому<br>
        Что вера есть в Него<br>
        Но веры нет  Ему</p>
    </CodeViewer>
  </div>
</template>
