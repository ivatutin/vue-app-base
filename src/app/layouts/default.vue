<template>
  <v-layout class="rounded rounded-md border">
    <AppSidebar />
    <AppHeader :title="$route.meta?.title?.value || $route.meta?.title" />
    <v-main class="d-flex align-center justify-center">
      <v-container>
        <router-view />
        $route.meta - {{ $route.meta.title }}
      </v-container>
    </v-main>
    <AppFooter />
  </v-layout>
</template>

<script lang="ts" setup>
import { AppHeader } from '@/widgets/app-header';
import { AppSidebar } from '@/widgets/app-sidebar';
import { AppFooter } from '@/widgets/app-footer';
import { useRouter, useRoute } from 'vue-router';

const $router = useRouter();
const $route = useRoute();

console.log($router.getRoutes());
console.log($router);
</script>
