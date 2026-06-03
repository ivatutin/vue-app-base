<script setup lang="ts">
  import { useCommandPalette } from '@/shared/lib/command-palette'
  import { useTheme } from '@/shared/lib/theme'
  import { Button, Divider, Icon, List, ListItem, Menu, Spacer } from '@/shared/ui/base'

  const { isDark, toggle } = useTheme()
  const palette = useCommandPalette()
  const route = useRoute()

  // Подсказка шортката: ⌘K на macOS, Ctrl K на остальных.
  const isMac = typeof navigator !== 'undefined'
    && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl K'

  /** Человекочитаемые названия для сегментов без собственного meta.title. */
  const LABEL_OVERRIDES: Record<string, string> = {
    'ui-kit': 'UI Kit',
    'auth': 'Авторизация',
    'system': 'Система',
  }

  function humanize (segment: string): string {
    return LABEL_OVERRIDES[segment]
      ?? segment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  /** Breadcrumbs из сегментов пути; последний — meta.title, если задан. */
  const crumbs = computed(() => {
    const segments = route.path.split('/').filter(Boolean)
    let acc = ''
    return segments.map((segment, index) => {
      acc += `/${segment}`
      const isLast = index === segments.length - 1
      return {
        label: isLast && route.meta.title ? route.meta.title : humanize(segment),
        to: acc,
        isLast,
      }
    })
  })
</script>

<template>
  <header class="flex items-center gap-2 h-14 px-4 border-b bg-surface text-surface-foreground">
    <!-- Breadcrumbs -->
    <nav aria-label="Хлебные крошки" class="flex items-center gap-1 min-w-0 text-sm">
      <RouterLink
        aria-label="На главную"
        class="flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        to="/"
      >
        <Icon name="mdi-home" size="sm" />
      </RouterLink>
      <template v-for="crumb in crumbs" :key="crumb.to">
        <Icon class="text-muted-foreground/60 shrink-0" name="mdi-chevron-right" size="sm" />
        <span
          v-if="crumb.isLast"
          aria-current="page"
          class="truncate font-medium text-foreground"
        >
          {{ crumb.label }}
        </span>
        <RouterLink
          v-else
          class="truncate rounded-md px-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :to="crumb.to"
        >
          {{ crumb.label }}
        </RouterLink>
      </template>
    </nav>

    <Spacer />

    <!-- Триггер командной палитры (⌘K) -->
    <button
      aria-label="Открыть поиск команд"
      class="hidden h-9 w-56 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex"
      type="button"
      @click="palette.open()"
    >
      <Icon name="mdi-magnify" size="sm" />
      <span class="flex-1 text-left">Поиск…</span>
      <kbd class="rounded border bg-surface px-1.5 py-0.5 text-xs tabular-nums">{{ shortcutLabel }}</kbd>
    </button>
    <!-- Компактный триггер на мобильных -->
    <Button
      class="sm:hidden"
      icon="mdi-magnify"
      title="Поиск команд"
      variant="text"
      @click="palette.open()"
    />

    <!-- Переключатель темы (отдельное действие, не спрятан в меню) -->
    <Button
      :icon="isDark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
      :title="isDark ? 'Светлая тема' : 'Тёмная тема'"
      variant="text"
      @click="toggle()"
    />

    <!-- Меню аккаунта -->
    <Menu location="bottom end">
      <template #activator="{ props }">
        <Button v-bind="props" icon="mdi-account" variant="text" />
      </template>

      <List density="compact">
        <!-- TODO: profile action (ROADMAP, Фаза 1 — auth flow) -->
        <ListItem icon="mdi-account-edit-outline" title="Мой профиль" />
        <Divider />
        <!-- TODO: logout action (ROADMAP, Фаза 1 — auth flow) -->
        <ListItem icon="mdi-exit-run" title="Выйти" />
      </List>
    </Menu>
  </header>
</template>
