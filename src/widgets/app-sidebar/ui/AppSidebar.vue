<script setup lang="ts">
import { sidebarItems } from '../model/sidebar-items'
import { can } from '@/entities/user'

const rail = shallowRef(true)

const visibleItems = computed(() =>
  sidebarItems.filter(item =>
    !item.permission || can(item.permission),
  ),
)
</script>
<template>
  <v-navigation-drawer :rail="rail" permanent>
    <v-btn @click="rail = !rail" :icon="rail ? 'mdi-unfold-more-vertical' : 'mdi-unfold-less-vertical'" variant="text" />
    <v-list>
      <v-list-item
        v-for="item in visibleItems"
        :key="item.to"
        :to="item.to"
        :prepend-icon="item.icon"
      >
        {{ item.label }}
      </v-list-item>
    </v-list>

  </v-navigation-drawer>
</template>