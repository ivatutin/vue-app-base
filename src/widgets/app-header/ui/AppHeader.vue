<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useUserStore } from '@/entities/user'
  import { useCommandPalette } from '@/shared/lib/command-palette'
  import { useTheme } from '@/shared/lib/theme'
  import { Button, Divider, Icon, List, ListItem, Menu, Spacer } from '@/shared/ui/base'

  const { isDark, toggle } = useTheme()
  const palette = useCommandPalette()
  const route = useRoute()

  /**
   * Ориентируемся на `isAuthenticated` (профиль загружен), а не на
   * `isAuthorized` (статус `active`): пользователю в `pending_verification`
   * или `suspended` меню как раз нужно — чтобы выйти. Предлагать ему
   * «Войти», когда он уже вошёл, было бы бессмыслицей.
   */
  const { isAuthenticated } = storeToRefs(useUserStore())

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
  <header class="flex items-center gap-2 h-14 px-4 border-b bg-sidebar text-surface-foreground">
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

    <!--
      Гостю меню аккаунта не показываем вовсе — ему нечего в нём делать,
      а «Мой профиль»/«Выйти» без сессии выглядят как сломанный интерфейс.
      Шапка видна анонимам на публичных страницах с default-layout:
      404 и /system/forbidden.
    -->
    <Button
      v-if="!isAuthenticated"
      size="sm"
      :to="{ name: '/auth/login' }"
      variant="brand"
    >
      Войти
    </Button>

    <!-- Меню аккаунта -->
    <Menu v-else location="bottom end">
      <template #activator="{ props }">
        <!--
          Иконочная кнопка без текста: без title/aria-label скринридер
          объявляет просто «кнопка», а Playwright/пользователь не могут
          найти её по имени. `title` даёт и подсказку при наведении,
          и accessible name.
        -->
        <Button
          v-bind="props"
          aria-label="Меню аккаунта"
          icon="mdi-account"
          title="Меню аккаунта"
          variant="text"
        />
      </template>

      <List density="compact">
        <!--
          Страницы профиля пока нет. Пункт помечен disabled, а не оставлен
          «живым»: кнопка, которая молча ничего не делает, хуже отсутствующей —
          пользователь считает, что сломалось приложение.
        -->
        <ListItem
          disabled
          icon="mdi-account-edit-outline"
          title="Мой профиль"
        />
        <Divider />
        <!--
          Ведём на /auth/logout, а не зовём logoutFlow отсюда: страница —
          единственное место, где выход выполняется, и она же показывает
          подтверждение. Дублировать сценарий в шапке значило бы иметь
          два пути выхода, которые разъедутся.
        -->
        <ListItem
          danger
          icon="mdi-exit-run"
          title="Выйти"
          :to="{ name: '/auth/logout' }"
        />
      </List>
    </Menu>
  </header>
</template>
