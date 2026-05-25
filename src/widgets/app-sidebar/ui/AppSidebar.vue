<script setup lang="ts">
  import { can } from '@/entities/user'
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
    <v-btn :icon="rail ? 'mdi-unfold-more-vertical' : 'mdi-unfold-less-vertical'" variant="text" @click="rail = !rail" />
    <v-list>
      <v-list-item
        v-for="item in visibleItems"
        :key="item.to"
        :prepend-icon="item.icon"
        :to="item.to"
      >
        {{ item.label }}
      </v-list-item>
    </v-list>

  </v-navigation-drawer>
</template>
