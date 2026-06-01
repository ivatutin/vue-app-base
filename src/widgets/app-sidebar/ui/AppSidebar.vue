<script setup lang="ts">
  import { can } from '@/entities/user'
  import { Button, List, ListItem } from '@/shared/ui/base'
  import { sidebarItems } from '../model/sidebar-items'

  const rail = shallowRef(true)

  const visibleItems = computed(() =>
    sidebarItems.filter(item =>
      !item.permission || can(item.permission),
    ),
  )
</script>

<template>
  <aside
    class="flex flex-col border-r bg-surface text-surface-foreground overflow-hidden transition-[width] duration-200 ease-in-out"
    :class="rail ? 'w-14' : 'w-56'"
  >
    <div class="p-1">
      <Button
        :icon="rail ? 'mdi-unfold-more-vertical' : 'mdi-unfold-less-vertical'"
        variant="text"
        @click="rail = !rail"
      />
    </div>
    <List nav>
      <ListItem
        v-for="item in visibleItems"
        :key="item.to"
        :icon="item.icon"
        :title="rail ? undefined : item.label"
        :to="item.to"
      />
    </List>
  </aside>
</template>
