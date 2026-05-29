<script setup lang="ts">
  import { useNotificationStore } from '@/entities/notification'
  import { Snackbar } from '@/shared/ui/base'

  const store = useNotificationStore()
  const { items } = storeToRefs(store)
</script>

<template>
  <!--
    Fixed wrapper для стека shadcn-Snackbar (top-right колонка).
    Для Vuetify v-snackbar wrapper noop — он порталится в body
    и позиционируется сам по location.
  -->
  <div class="app-notifications fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
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
