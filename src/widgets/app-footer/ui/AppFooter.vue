<script setup lang="ts">
  const year = new Date().getFullYear()
</script>

<template>
  <footer class="flex items-center justify-between gap-3 h-9 px-4 border-t bg-surface text-xs text-muted-foreground">
    <span>© {{ year }} vue-app-base</span>
    <span class="tabular-nums">v0.0.1</span>
  </footer>
</template>
