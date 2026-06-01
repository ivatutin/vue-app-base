<script setup lang="ts">
  import { AppNotifications } from '@/widgets/app-notifications'
</script>

<template>
  <div class="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <router-view />
    </div>
  </div>
  <AppNotifications />
</template>
