<script setup lang="ts">
/**
 * Catch-all для несуществующих URL.
 *
 * Без него неизвестный адрес давал пустой `matched`, из-за чего
 * `to.meta.noAuth` был `undefined` — guard считал маршрут защищённым
 * и уводил на login. Пользователь получал форму входа вместо «404»,
 * а будучи уже залогиненным — вообще непонятно что.
 *
 * `noAuth: true` обязателен: 404 показываем всем, в том числе гостям.
 *
 * Страница ловит адрес как есть и не редиректит — так в адресной
 * строке остаётся то, что пользователь ввёл или по чему перешёл,
 * и ошибку видно в логах и в шаринге ссылки.
 */
  import { Button, EmptyState } from '@/shared/ui/base'

  definePage({
    name: 'not-found',
    meta: {
      title: 'Страница не найдена',
      noAuth: true,
    },
  })
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <EmptyState
      description="Возможно, страница была перемещена или удалена, либо ссылка содержит ошибку."
      icon="mdi-file-question"
      title="404 · Страница не найдена"
    >
      <Button variant="brand" @click="$router.replace({ name: '/dashboard' })">
        На главную
      </Button>
    </EmptyState>
  </div>
</template>
