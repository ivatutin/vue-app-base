<script setup lang="ts">
definePage({
  meta: {
    noAuth: true,
  },
})
</script>

<template>
  <v-card>
    <v-card-text>
        <h1>Вы вышли!</h1>
    </v-card-text>
    <v-divider />
    <v-card-actions>
        <v-btn> -> Войти</v-btn>
        <v-btn> -> Регистрация</v-btn>
    </v-card-actions>
  </v-card>
</template>