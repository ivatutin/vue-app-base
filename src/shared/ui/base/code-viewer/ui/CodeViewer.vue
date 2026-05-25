<script setup lang="ts">
  import { escapeHtml } from '../lib/escape-html'

  const codeMode = ref(false)
  const refSlotWrapper = useTemplateRef('refSlotWrapper')

  let htmlContent = ''
  onMounted(() => {
    htmlContent = escapeHtml(refSlotWrapper.value?.innerHTML || '')
  })
</script>
<template>
  <v-card>
    <v-btn
      class="position-absolute right-0"
      :icon="codeMode ? 'mdi-chevron-double-up' : 'mdi-xml'"
      size="small"
      variant="text"
      @click="codeMode = !codeMode"
    />
    <!-- <v-toolbar density="compact">
            <template v-slot:append>
                <v-btn @click="codeMode = !codeMode" :icon="codeMode ? 'mdi-chevron-double-up' : 'mdi-xml'" size="small" />
            </template>
        </v-toolbar> -->

    <v-slide-y-transition v-show="codeMode">
      <div>
        <v-card-text class="bg-surface-light">
          <code v-html="htmlContent" />
        </v-card-text>
        <v-divider />
      </div>
    </v-slide-y-transition>
    <v-card-text>
      <div ref="refSlotWrapper">
        <slot />
      </div>
    </v-card-text>
  </v-card>
</template>
