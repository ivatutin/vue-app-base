<script setup lang="ts">
  import type { TabsTriggerProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import { reactiveOmit } from '@vueuse/core'
  import { TabsTrigger } from 'reka-ui'
  import { cn } from '@/shared/lib/utils/cn'

  const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes['class'] }>()

  const delegated = reactiveOmit(props, 'class')
</script>

<template>
  <TabsTrigger
    v-bind="delegated"
    :class="
      cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        props.class,
      )
    "
  >
    <slot />
  </TabsTrigger>
</template>
