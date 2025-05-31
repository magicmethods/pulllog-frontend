<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'

definePageMeta({
    layout: 'auth'
})

const userStore = useUserStore()

const userId = ref<string>('')
const password = ref<string>('')

async function handleLogin() {
  if (!userId.value || !password.value) {
    // Show error message if userId or password is empty
    return
  }

  await userStore.login(userId.value, password.value)
    .then(() => {
      if (userStore.isAuthenticated) {
        // Redirect to the history page after successful login
        navigateTo({ path: '/history' })
      } else {
        // Handle case where login was not successful
        // 暫定処理: 強制ログイン
        userStore.setDummyUser({ id: 999, email: userId.value })
        console.error('Login failed: Invalid credentials', userStore.user)
        navigateTo({  path: '/history' })
      }
    })
    .catch((error) => {
      // Handle login error
      console.error('Login failed:', error)
    })

}

</script>

<template>
  <div class="flex flex-col gap-12">
    <div class="flex flex-col gap-4 items-center">
      <h1 class="text-2xl font-bold">PullLog</h1>

      <p class="text-surface-500 dark:text-surface-400 block mb-2">ログイン情報を入力してください</p>

      <form @submit.prevent="handleLogin" class="flex flex-col gap-4 w-full max-w-sm">
        <InputText
          v-model="userId"
          placeholder="ユーザーID"
          class="flex-auto w-full"
          autocomplete="username"
        />
        <Password
          v-model="password"
          placeholder="パスワード"
          class="flex-auto w-full"
          :feedback="false"
          toggleMask
          :pt:pcinputtext:root="{ autocomplete: 'current-password' }"
        />

        <div class="flex justify-end gap-2">
          <Button
            type="submit"
            label="ログイン"
            class="btn btn-primary"
          />
        </div>      
      </form>
      <Message severity="info" size="small" variant="simple" class="py-1 px-2">
        アカウントをお持ちでない方は、<nuxt-link to="/auth/register" class="text-blue-500">こちら</nuxt-link>から登録してください。
      </Message>
    </div>
    <slot />
  </div>
</template>