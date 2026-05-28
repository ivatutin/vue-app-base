<script setup lang="ts">
/**
 * Обёртка над <v-card> (ADR-0007, Фаза 2.6).
 *
 * Слоты: header, default (body), footer. Если соответствующий слот
 * не передан — секция не рендерится. Подразумевается, что почти
 * все потребители используют header+body или header+body+footer.
 */
  import { VCard, VCardActions, VCardText, VCardTitle, VDivider } from 'vuetify/components'

  withDefaults(defineProps<{
    width?: string | number
    title?: string
  }>(), {})
</script>

<template>
  <VCard :width="width">
    <VCardTitle v-if="$slots.header || title">
      <slot name="header">{{ title }}</slot>
    </VCardTitle>
    <VCardText v-if="$slots.default">
      <slot />
    </VCardText>
    <template v-if="$slots.footer">
      <VDivider />
      <VCardActions>
        <slot name="footer" />
      </VCardActions>
    </template>
  </VCard>
</template>
