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
  <v-navigation-drawer permanent :rail="rail">
    <Button
      :icon="rail ? 'mdi-unfold-more-vertical' : 'mdi-unfold-less-vertical'"
      variant="text"
      @click="rail = !rail"
    />
    <List nav>
      <ListItem
        v-for="item in visibleItems"
        :key="item.to"
        :icon="item.icon"
        :title="item.label"
        :to="item.to"
      />
    </List>
  </v-navigation-drawer>
</template>
