<script setup lang="ts">
  const now = shallowRef(new Date())

  const timer = setInterval(() => (now.value = new Date()), 1000)

  onBeforeUnmount(() => {
    clearInterval(timer)
  })
</script>

<template>
  <footer class="flex items-center justify-end gap-3 h-10 px-4 border-t bg-surface text-surface-foreground text-xs">
    <nav class="flex items-center gap-2">
      <router-link class="hover:underline" :to="{ name: '/' }">
        home
      </router-link>
      <span class="opacity-50">|</span>
      <router-link class="hover:underline" :to="{ name: '/system/forbidden' }">
        forbidden
      </router-link>
      <span class="opacity-50">|</span>
      <router-link class="hover:underline" :to="{ name: 'not-found' }">
        not-found
      </router-link>
      <span class="opacity-50">|</span>
      <router-link class="hover:underline" :to="{ name: '/ui-kit/typography' }">
        /ui-kit/typography
      </router-link>
      <span class="opacity-50">|</span>
      <router-link class="hover:underline" :to="{ name: '/ui-kit/buttons' }">
        /ui-kit/buttons
      </router-link>
    </nav>
    <div class="opacity-70">
      {{ now.toLocaleTimeString() }}
    </div>
  </footer>
</template>
