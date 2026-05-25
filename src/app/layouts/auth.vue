<script setup lang="ts">
import { AppNotifications } from '@/widgets/app-notifications'
</script>

<template>
  <v-app>
    <v-main class="d-flex align-center justify-center">
      <v-container class="d-flex justify-center" style="max-width: 480px;">
        <router-view />
      </v-container>
    </v-main>
    <AppNotifications />
  </v-app>
</template>
