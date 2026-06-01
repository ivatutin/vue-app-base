<script lang="ts" setup>
  import { useBootstrapStore } from '@/entities/bootstrap'
  import { AppPreloader } from '@/widgets/app-preloader'

  const bootstrap = useBootstrapStore()
</script>

<template>
  <router-view v-if="bootstrap.isReady" />
  <AppPreloader v-else />
</template>
