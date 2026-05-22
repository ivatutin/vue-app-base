<script setup lang="ts">
import { useTheme } from 'vuetify'

const theme = useTheme();
const $props = defineProps({
  title: String
})
</script>
<template>
    <v-app-bar :title="$props.title" :order="1" flat>
      <template #append>
        <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn icon="mdi-dots-vertical" variant="text" v-bind="props"></v-btn>
            </template>

            <v-list density="compact">
              <!-- TODO: profile action (ROADMAP, Фаза 1 — auth flow) -->
              <v-list-item prepend-icon="mdi-account-edit-outline" title="Мой профиль" density="compact" />
              <v-list-item v-if="'light' == theme.name.value" @click="theme.toggle()" prepend-icon="mdi-weather-night" title="Темная тема" density="compact" />
              <v-list-item v-if="'dark' == theme.name.value" @click="theme.toggle()" prepend-icon="mdi-white-balance-sunny" title="Светлая тема" density="compact" />
              <v-divider />
              <!-- TODO: logout action (ROADMAP, Фаза 1 — auth flow) -->
              <v-list-item prepend-icon="mdi-exit-run" title="Выйти" density="compact" />
            </v-list>
          </v-menu>
      </template>
    </v-app-bar>
</template>
