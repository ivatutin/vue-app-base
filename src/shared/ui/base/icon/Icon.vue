<script setup lang="ts">
/**
 * Обёртка над <v-icon> (ADR-0007, Фаза 2.6).
 *
 * **Текущий контракт name:** строка MDI (например, `mdi-account`).
 * В Фазе 2.7 при переходе на lucide-vue-next введём словарь
 * семантических имён (`user`, `logout`, `dashboard`, ...) и потребители
 * перейдут на них без правок shapes — изменится только Icon.vue.
 */
  import { VIcon } from 'vuetify/components'

  type Size = 'sm' | 'md' | 'lg' | 'xl'

  const props = withDefaults(defineProps<{
    name: string
    size?: Size
    color?: string
  }>(), {
    size: 'md',
  })

  const vuetifySize = computed(() => {
    switch (props.size) {
      case 'sm': { return 'small' as const }
      case 'lg': { return 'large' as const }
      case 'xl': { return 'x-large' as const }
      default: { return 'default' as const }
    }
  })
</script>

<template>
  <VIcon :color="color" :icon="name" :size="vuetifySize" />
</template>
