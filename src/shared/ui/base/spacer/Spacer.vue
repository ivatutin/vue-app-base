<script setup lang="ts">
/**
 * Тонкая обёртка над <v-spacer> — flex-grow:1 (ADR-0007, Фаза 2.6).
 * В Фазе 2.7 заменится на <div class="flex-1"> через Tailwind.
 */
  import { VSpacer } from 'vuetify/components'
</script>

<template>
  <VSpacer />
</template>
