<script setup lang="ts">
/**
 * Tabs — корневой компонент. Обёртка над reka-ui TabsRoot.
 *
 * Использование:
 * ```vue
 * <Tabs v-model="active" default-value="email">
 *   <TabsList>
 *     <TabsTrigger value="email">По email</TabsTrigger>
 *     <TabsTrigger value="phone">По телефону</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="email">...</TabsContent>
 *   <TabsContent value="phone">...</TabsContent>
 * </Tabs>
 * ```
 */
  import type { TabsRootEmits, TabsRootProps } from 'reka-ui'
  import { TabsRoot, useForwardPropsEmits } from 'reka-ui'

  const props = defineProps<TabsRootProps>()
  const emits = defineEmits<TabsRootEmits>()

  const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <TabsRoot v-bind="forwarded">
    <slot />
  </TabsRoot>
</template>
