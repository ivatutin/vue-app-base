<script setup lang="ts">
  import { VDivider } from 'vuetify/components'

  withDefaults(defineProps<{
    vertical?: boolean
  }>(), { vertical: false })
</script>

<template>
  <VDivider :vertical="vertical" />
</template>
