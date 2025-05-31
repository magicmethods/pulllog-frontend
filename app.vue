<script setup lang="ts">

const csrfStore = useCsrfStore()
csrfStore.loadFromCookie()

console.log('app.vue::csrfStore:', csrfStore.token !== '' ? csrfStore.token : null)

</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
