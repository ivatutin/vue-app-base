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
        <v-text-field label="Телефон/E-mail" />
        <v-text-field label="Пароль" type="password" />
    </v-card-text>
    <v-divider />
    <v-card-actions>
        <v-btn>Войти</v-btn>
    </v-card-actions>
  </v-card>
</template>