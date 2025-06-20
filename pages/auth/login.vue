<script setup lang="ts">
import { z } from 'zod'
import { useUserStore } from '~/stores/useUserStore'
import { useAuth }  from '~/composables/useAuth'

definePageMeta({
    layout: 'auth'
})

// Schema for form validation
const loginSchema = z.object({
  email: z.string().email({ message: '有効なメールアドレスを入力してください' }),
  password: z.string().min(8, { message: 'パスワードは8文字以上で入力してください' }),
})

// Stores etc.
const userStore = useUserStore()
const { login } = useAuth()

// Refs & Local variables
const form = reactive({
  email: '',
  password: '',
})
const errors = reactive<{ email?: string, password?: string }>({})
const globalError = ref<string | null>(null) // グローバルエラーメッセージ
const touched = reactive<{ email: boolean, password: boolean }>({
  email: false,
  password: false,
})
const isSubmitting = ref<boolean>(false)
const externalLogin = [
  { service: 'google', label: 'Googleでログイン', icon: 'pi pi-google' },
  // { service: 'github', label: 'GitHubでログイン', icon: 'pi pi-github' },
]

// Methods
function handleBlur(field: 'email' | 'password') {
  touched[field] = true
  validate()
}
function validate(): boolean {
  const result = loginSchema.safeParse(form)
  errors.email = undefined
  errors.password = undefined
  if (!result.success) {
    for (const issue of result.error.issues) {
      if (issue.path.length > 0) {
        const field = issue.path[0] as 'email' | 'password'
        if (touched[field]) errors[field] = issue.message
      }
    }
    return false
  }
  return true
}
async function handleLogin() {
  touched.email = true
  touched.password = true
  if (!validate()) return
  isSubmitting.value = true

  try {
    await login(form.email, form.password)
    if (userStore.isLoggedIn) {
      // Redirect to the home page after successful login
      navigateTo({ path: userStore.user?.homePage ?? '/apps' })
    }
    // Handle case where login was not successful
    globalError.value = 'ログインに失敗しました。メールアドレスとパスワードを確認してください'
  } catch (e: unknown) {
    // Handle login error
    const appConfig = useAppConfig()
    if (appConfig.isDebug) {
      // 暫定処理: 強制ログイン
      userStore.setDummyUser({ id: 999, email: form.email })
      navigateTo({ path: userStore.user?.homePage ?? '/apps' })
      return
    }
    globalError.value = e instanceof Error ? e.message : 'ログインに失敗しました。メールアドレスとパスワードを確認してください'
    console.error('Login failed:', e)
  } finally {
    isSubmitting.value = false
  }
}
async function handleOauthLogin(service: string) {
  // OAuthは別途バリデーションや認証フローが必要なら追記
  if (!form.email || !form.password) {
    // Show error message if userId or password is empty
    return
  }

  console.log(`OAuth login with ${service} initiated for email: ${form.email}`)
}
function handleBack() {
  navigateTo({ path: '/' })
}

// Watchers
watch(form, () => validate(), { deep: true })

</script>

<template>
  <div class="flex flex-col gap-12">
    <div class="relative flex flex-col gap-2 items-center mb-2">
      <h1 class="text-2xl font-bold mb-2">PullLog</h1>

      <p class="text-surface-500 dark:text-surface-400 block mb-2">ログイン情報を入力してください</p>

      <form @submit.prevent="handleLogin" class="flex flex-col gap-4 w-full max-w-sm" autocomplete="on">
        <InputText
          v-model="form.email"
          inputmode="email"
          placeholder="メールアドレス"
          class="flex-auto w-full"
          autocomplete="username"
          :class="{ 'p-invalid': touched.email && errors.email }"
          @blur="handleBlur('email')"
        />
        <Message v-if="touched.email && errors.email" severity="error" size="small" variant="simple" class="mb-2">
          {{ errors.email }}
        </Message>

        <Password
          v-model="form.password"
          placeholder="パスワード"
          class="flex-auto w-full"
          :feedback="false"
          toggleMask
          :pt:pcinputtext:root="{ inputmode: 'text', autocomplete: 'current-password',
            class: { 'p-invalid': touched.password && errors.password },
          }"
          @blur="handleBlur('password')"
        />
        <Message v-if="touched.password && errors.password" severity="error" size="small" variant="simple" class="mb-2">
          {{ errors.password }}
        </Message>

        <!-- グローバルエラー表示 -->
        <Message v-if="globalError" severity="error" size="small" class="mb-2">
          {{ globalError }}
        </Message>

        <div class="flex justify-end gap-2">
          <Button
            type="submit"
            label="ログイン"
            class="btn btn-primary"
            :disabled="!validate() || isSubmitting"
          />
        </div>      
      </form>

      <div v-if="externalLogin.length" class="flex flex-col gap-4 w-full">
        <Divider align="center" class="mt-2! mb-0!" :pt="{ content: 'dark:bg-gray-800' }">
          <span class="px-2! text-surface-500 dark:text-surface-400 dark:bg-gray-800">または</span>
        </Divider>
        <Button
          v-for="service in externalLogin"
          :key="service.service"
          :label="service.label"
          :icon="service.icon"
          class="btn btn-alt w-full mb-0"
          @click="handleOauthLogin(service.service)"
        />
      </div>

      <Divider />
      <Message severity="info" size="small" variant="simple">
        アカウントをお持ちでない方は<nuxt-link to="/auth/register" class="font-semibold">新規登録</nuxt-link>してください
      </Message>
      <Message severity="info" size="small" variant="simple">
        パスワードをお忘れの方は<nuxt-link to="/auth/forget" class="font-semibold">再設定</nuxt-link>してください
      </Message>
      <div class="absolute top-0 right-0">
        <div
          class="btn-back"
          @click="handleBack"
          aria-label="戻る"
        >
          <i class="pi pi-times"></i>
        </div>
      </div>
    </div>
    <slot />
  </div>
</template>