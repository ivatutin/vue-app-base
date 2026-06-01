<script setup lang="ts">
  import { useTheme } from '@/shared/lib/theme'
  import { Button, Divider, List, ListItem, Menu, Spacer } from '@/shared/ui/base'

  const { isDark, toggle } = useTheme()

  defineProps<{
    title?: string
  }>()
</script>

<template>
  <header class="flex items-center h-14 px-4 border-b bg-surface text-surface-foreground">
    <h1 v-if="title" class="text-lg font-semibold">
      {{ title }}
    </h1>
    <Spacer />
    <Menu location="bottom end">
      <template #activator="{ props }">
        <Button v-bind="props" icon="mdi-dots-vertical" variant="text" />
      </template>

      <List density="compact">
        <!-- TODO: profile action (ROADMAP, Фаза 1 — auth flow) -->
        <ListItem icon="mdi-account-edit-outline" title="Мой профиль" />
        <ListItem
          v-if="!isDark"
          icon="mdi-weather-night"
          title="Темная тема"
          @click="toggle()"
        />
        <ListItem
          v-if="isDark"
          icon="mdi-white-balance-sunny"
          title="Светлая тема"
          @click="toggle()"
        />
        <Divider />
        <!-- TODO: logout action (ROADMAP, Фаза 1 — auth flow) -->
        <ListItem icon="mdi-exit-run" title="Выйти" />
      </List>
    </Menu>
  </header>
</template>
