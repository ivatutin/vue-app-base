<script setup lang="ts">
  import { useTheme } from 'vuetify'
  import { Button, Divider, List, ListItem, Menu } from '@/shared/ui/base'

  const theme = useTheme()

  defineProps<{
    title?: string
  }>()
</script>

<template>
  <v-app-bar flat :order="1" :title="title">
    <template #append>
      <Menu>
        <template #activator="{ props }">
          <Button v-bind="props" icon="mdi-dots-vertical" variant="text" />
        </template>

        <List density="compact">
          <!-- TODO: profile action (ROADMAP, Фаза 1 — auth flow) -->
          <ListItem icon="mdi-account-edit-outline" title="Мой профиль" />
          <ListItem
            v-if="theme.name.value === 'light'"
            icon="mdi-weather-night"
            title="Темная тема"
            @click="theme.toggle()"
          />
          <ListItem
            v-if="theme.name.value === 'dark'"
            icon="mdi-white-balance-sunny"
            title="Светлая тема"
            @click="theme.toggle()"
          />
          <Divider />
          <!-- TODO: logout action (ROADMAP, Фаза 1 — auth flow) -->
          <ListItem icon="mdi-exit-run" title="Выйти" />
        </List>
      </Menu>
    </template>
  </v-app-bar>
</template>
