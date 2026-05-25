<script setup lang="ts">
  import { useTheme } from 'vuetify'

  const theme = useTheme()
  const $props = defineProps({
    title: String,
  })
</script>
<template>
  <v-app-bar flat :order="1" :title="$props.title">
    <template #append>
      <v-menu>
        <template #activator="{ props }">
          <v-btn icon="mdi-dots-vertical" variant="text" v-bind="props" />
        </template>

        <v-list density="compact">
          <!-- TODO: profile action (ROADMAP, Фаза 1 — auth flow) -->
          <v-list-item density="compact" prepend-icon="mdi-account-edit-outline" title="Мой профиль" />
          <v-list-item
            v-if="'light' == theme.name.value"
            density="compact"
            prepend-icon="mdi-weather-night"
            title="Темная тема"
            @click="theme.toggle()"
          />
          <v-list-item
            v-if="'dark' == theme.name.value"
            density="compact"
            prepend-icon="mdi-white-balance-sunny"
            title="Светлая тема"
            @click="theme.toggle()"
          />
          <v-divider />
          <!-- TODO: logout action (ROADMAP, Фаза 1 — auth flow) -->
          <v-list-item density="compact" prepend-icon="mdi-exit-run" title="Выйти" />
        </v-list>
      </v-menu>
    </template>
  </v-app-bar>
</template>
