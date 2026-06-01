<script setup lang="ts">
  import { Button, Card, Divider } from '@/shared/ui/base'
  import { escapeHtml } from '../lib/escape-html'

  const codeMode = ref(false)
  const refSlotWrapper = useTemplateRef('refSlotWrapper')

  let htmlContent = ''
  onMounted(() => {
    htmlContent = escapeHtml(refSlotWrapper.value?.innerHTML || '')
  })
</script>

<template>
  <Card>
    <div class="relative">
      <Button
        class="absolute right-2 top-2"
        :icon="codeMode ? 'mdi-chevron-double-up' : 'mdi-xml'"
        size="sm"
        variant="text"
        @click="codeMode = !codeMode"
      />
      <div v-show="codeMode" class="bg-muted p-4">
        <code v-html="htmlContent" />
      </div>
      <Divider v-show="codeMode" />
      <div ref="refSlotWrapper" class="p-4">
        <slot />
      </div>
    </div>
  </Card>
</template>
