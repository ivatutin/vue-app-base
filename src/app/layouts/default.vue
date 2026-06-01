<script lang="ts" setup>
  import { AppFooter } from '@/widgets/app-footer'
  import { AppHeader } from '@/widgets/app-header'
  import { AppNotifications } from '@/widgets/app-notifications'
  import { AppSidebar } from '@/widgets/app-sidebar'
</script>

<template>
  <div class="grid grid-rows-[auto_1fr_auto] grid-cols-[auto_1fr] h-dvh bg-background text-foreground overflow-hidden">
    <AppHeader class="col-span-2" :title="$route.meta?.title" />
    <AppSidebar />
    <main class="overflow-auto p-4">
      <router-view />
    </main>
    <AppFooter class="col-span-2" />
  </div>
  <AppNotifications />
</template>
