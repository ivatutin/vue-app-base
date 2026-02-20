<script lang="ts" setup>
import { HelloWorld } from '@/widgets/hello-world';
definePage({
  meta: {
    noAuth: true,
  },
})
</script>

<template>
  <HelloWorld />
</template>