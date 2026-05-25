<script setup lang="ts">
import { useNotificationStore } from '@/entities/notification'

const store = useNotificationStore()
const { items } = storeToRefs(store)
</script>

<template>
  <div class="app-notifications">
    <v-snackbar
      v-for="item in items"
      :key="item.id"
      :model-value="true"
      :color="item.kind"
      :timeout="item.timeout || -1"
      location="top right"
      multi-line
      @update:model-value="(v) => !v && store.dismiss(item.id)"
    >
      {{ item.message }}
      <template #actions>
        <v-btn icon="mdi-close" variant="text" @click="store.dismiss(item.id)" />
      </template>
    </v-snackbar>
  </div>
</template>
