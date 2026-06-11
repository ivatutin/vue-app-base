<script setup lang="ts">
  import type { TabsListProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import { reactiveOmit } from '@vueuse/core'
  import { TabsList } from 'reka-ui'
  import { cn } from '@/shared/lib/utils/cn'

  const props = defineProps<TabsListProps & { class?: HTMLAttributes['class'] }>()

  const delegated = reactiveOmit(props, 'class')
</script>

<template>
  <TabsList
    v-bind="delegated"
    :class="
      cn(
        'inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        props.class,
      )
    "
  >
    <slot />
  </TabsList>
</template>
