<script setup lang="ts">
definePage({
  meta: {
    title: ref('Dashboard'),
    requiresAuth: true,
    //layout: 'main',
  },
})
const $route = useRoute()
let i = 0;
let timer;
onMounted(() => {
    timer = setInterval(() => {
        $route.meta.title.value = 'Dashboard #'+(i++)
        console.log('$route.meta.title', $route.meta.title)
    }, 1000)
})

onBeforeUnmount(() => {
    clearInterval(timer)
})
</script>

<template>
  forbidden
</template>