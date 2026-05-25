<template>
  <v-layout class="rounded rounded-md border">
    <AppSidebar />
    <AppHeader :title="$route.meta?.title" />
    <v-main class="d-flex align-center justify-center">
      <v-container>
        <router-view />
      </v-container>
    </v-main>
    <AppFooter />
    <AppNotifications />
  </v-layout>
</template>

<script lang="ts" setup>
  import { AppFooter } from '@/widgets/app-footer'
  import { AppHeader } from '@/widgets/app-header'
  import { AppNotifications } from '@/widgets/app-notifications'
  import { AppSidebar } from '@/widgets/app-sidebar'
</script>
