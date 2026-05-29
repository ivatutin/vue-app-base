<script setup lang="ts">
  import { useNotificationStore } from '@/entities/notification'
  import { Snackbar } from '@/shared/ui/base'

  const store = useNotificationStore()
  const { items } = storeToRefs(store)
</script>

<template>
  <div class="app-notifications">
    <Snackbar
      v-for="item in items"
      :key="item.id"
      :kind="item.kind"
      :message="item.message"
      :timeout="item.timeout || -1"
      @close="store.dismiss(item.id)"
    />
  </div>
</template>
