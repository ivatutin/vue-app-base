<template>
  <v-footer app class="justify-end" height="40">
    <div class="text-caption">
      <router-link :to="{ name: '/' }">home</router-link>
      |
      <router-link :to="{ name: '/system/forbidden' }">forbidden</router-link>
      |
      <router-link :to="{ name: 'not-found' }">not-found</router-link>
      |
      <router-link :to="{ name: '/ui-kit/typography' }">/ui-kit/typography</router-link>
      |
      <router-link :to="{ name: '/ui-kit/buttons' }">/ui-kit/buttons</router-link>
    </div>
    <div class="text-caption">
      {{ now.toLocaleTimeString() }}
    </div>
  </v-footer>
</template>

<script setup lang="ts">
  const now = shallowRef(new Date())

  const timer = setInterval(() => now.value = new Date(), 1000)

  onBeforeUnmount(() => {
    clearInterval(timer)
  })
</script>
