<script setup lang="ts">

definePageMeta({
    layout: 'auth'
})

</script>

<template>
  <div class="flex flex-col gap-12">
    <div class="flex flex-col gap-4 items-center">
      <h1 class="text-2xl font-bold">サインアップ</h1>
      <p class="text-gray-500">アカウントをお持ちの方は、<nuxt-link to="/auth/login" class="text-blue-500">こちら</nuxt-link>からログインしてください。</p>
    </div>
    <slot />
  </div>
</template>