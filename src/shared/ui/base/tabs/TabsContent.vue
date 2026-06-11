<script setup lang="ts">
  import type { TabsContentProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import { reactiveOmit } from '@vueuse/core'
  import { TabsContent } from 'reka-ui'
  import { cn } from '@/shared/lib/utils/cn'

  const props = defineProps<TabsContentProps & { class?: HTMLAttributes['class'] }>()

  const delegated = reactiveOmit(props, 'class')
</script>

<template>
  <TabsContent
    v-bind="delegated"
    :class="
      cn(
        'mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        props.class,
      )
    "
  >
    <slot />
  </TabsContent>
</template>
