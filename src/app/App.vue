<script lang="ts" setup>
  import { useBootstrapStore } from '@/entities/bootstrap'
  import { AppPreloader } from '@/widgets/app-preloader'

  const bootstrap = useBootstrapStore()
</script>

<template>
  <v-app v-if="bootstrap.isReady">
    <router-view />
  </v-app>
  <AppPreloader v-else />
</template>
