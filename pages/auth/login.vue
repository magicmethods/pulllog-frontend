<script setup lang="ts">
import { z } from 'zod'
import { useUserStore } from '~/stores/useUserStore'
import { useI18n } from 'vue-i18n'
import { useAuth }  from '~/composables/useAuth'

definePageMeta({
    layout: 'auth'
})

// Stores etc.
const userStore = useUserStore()
const { login } = useAuth()
const { t } = useI18n()

// Refs & Local variables
const form = reactive({
  email: '',
  password: '',
  remember: false,
})
const errors = reactive<{ email?: string, password?: string }>({})
const globalError = ref<string | null>(null) // グローバルエラーメッセージ
const touched = reactive<{ email: boolean, password: boolean }>({
  email: false,
  password: false,
})
const isSubmitting = ref<boolean>(false)
const externalLogin = [
  { service: 'google', label: t('auth.login.google'), icon: 'pi pi-google', enabled: false },
  { service: 'apple', label: t('auth.login.apple'), icon: 'pi pi-apple', enabled: false },
  { service: 'microsoft', label: t('auth.login.microsoft'), icon: 'pi pi-windows', enabled: false },
  { service: 'twitter', label: t('auth.login.twitter'), icon: 'pi pi-twitter', enabled: false }, // Xは非推奨
  { service: 'facebook', label: t('auth.login.facebook'), icon: 'pi pi-facebook', enabled: false }, // Facebookは非推奨
  { service: 'github', label: t('auth.login.github'), icon: 'pi pi-github', enabled: false },
]
const enabledExternalLogin = externalLogin.filter(service => service.enabled)
// Schema for form validation
const loginSchema = computed(() => z.object({
  email: z.string().email({ message: t('validation.invalidEmail') }),
  password: z.string().min(8, { message: t('validation.shortPassword') }),
}))
const isFormValid = computed(() => loginSchema.value.safeParse(form).success)

// Methods
// 指定フィールドのみバリデーション
function validateFields(fields: ('email' | 'password')[]) {
    for (const f of fields) {
        if (!form[f]) {
            errors[f] = undefined
            continue
        }
        touched[f] = true
        const result = loginSchema.value.shape[f].safeParse(form[f])
        errors[f] = result.success ? undefined : result.error.issues[0]?.message
    }
    return fields.every(f => !errors[f])
}
// 全体バリデーション
function validateAll(): boolean {
    touched.email = true
    touched.password = true
    const result = loginSchema.value.safeParse(form)
    errors.email = undefined
    errors.password = undefined
    if (!result.success) {
        for (const issue of result.error.issues) {
            if (issue.path.length > 0) {
                const field = issue.path[0] as keyof typeof touched
                if (form[field]) errors[field] = issue.message
            }
        }
        return false
    }
    return true
}

function handleBlur(field: 'email' | 'password') {
  touched[field] = true
  validateFields([field])
}

async function handleLogin() {
  globalError.value = null
  if (!validateAll()) return
  isSubmitting.value = true
  try {
    await login(form.email, form.password)
    if (userStore.isLoggedIn) {
      // Redirect to the home page after successful login
      navigateTo({ path: userStore.user?.homePage ?? '/apps' })
      return
    }
    // Handle case where login was not successful
    throw new Error()
  } catch (e: unknown) {
    // Handle login error
    console.error('Login failed:', e)
    globalError.value = e instanceof Error ? e.message : t('auth.login.failed')
    isSubmitting.value = false
  } finally {
    // 次ページへの遷移完了までローディング状態を維持するため
    // isSubmitting.value = false
  }
}

async function handleOauthLogin(service: string) {
  // OAuthは別途バリデーションや認証フローが必要
  if (!form.email || !form.password) {
    // Show error message if userId or password is empty
    return
  }

  console.log(`OAuth login with ${service} initiated for email: ${form.email}`)
}

function handleBack() {
  navigateTo({ path: '/' })
}

function autoLoginWithRememberToken() {
  // Cookieからトークンを取得して自動ログイン
  return new Promise<void>((resolve, reject) => {
    const token = useCookie('remember_token').value
    if (!token) {
      reject(new Error('No remember token found'))
      return
    }
    /*
    autoLogin(token)
      .then(() => resolve())
      .catch(err => reject(err))
    */
  })
}

// Lifecycle hooks
onBeforeMount(async () => {
  if (import.meta.client) {
    // 自動ログインAPI呼び出し
    try {
      await autoLoginWithRememberToken() // Cookieを自動で送信
      // 成功したらダッシュボード等へリダイレクト
      navigateTo({ path: userStore.user?.homePage ?? '/apps' })
    } catch (e: unknown) {
      // 失敗時は何もしない（ログイン画面を通常通り表示）
      console.warn('Auto login failed:', e instanceof Error ? e.message : e)
    }
  }
})

</script>

<template>
  <div class="flex flex-col gap-12">
    <Head>
      <Title>{{ `${t('auth.login.submit')} | ${t('app.name')}` }}</Title>
    </Head>
    <div class="relative flex flex-col gap-2 items-center mb-2">
      <h1 class="text-2xl font-bold mb-2">{{ t('app.name') }}</h1>

      <p class="text-surface-500 dark:text-surface-400 block mb-2">{{ t('auth.login.prompt') }}</p>

      <form @submit.prevent="handleLogin" class="flex flex-col gap-4 w-full max-w-sm" autocomplete="on">
        <InputText
          v-model="form.email"
          inputmode="email"
          :placeholder="t('auth.login.emailPlaceholder')"
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
          :placeholder="t('auth.login.passwordPlaceholder')"
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

        <div class="flex items-center gap-2">
          <Checkbox
            v-model="form.remember"
            :binary="true"
            inputId="remember-me"
          />
          <label for="remember-me" tabindex="0" class="font-normal text-base text-surface-500 dark:text-gray-400 select-none">
            {{ t('auth.login.rememberMe') }}
          </label>
        </div>

        <!-- グローバルエラー表示 -->
        <Message v-if="globalError" severity="error" size="small" class="mb-2">
          {{ globalError }}
        </Message>

        <div class="flex justify-end gap-2">
          <Button
            type="submit"
            :label="isSubmitting ? t('auth.login.loading') : t('auth.login.submit')"
            class="btn btn-primary w-40"
            :disabled="isSubmitting || !isFormValid"
            :loading="isSubmitting"
          />
        </div>      
      </form>

      <div v-if="enabledExternalLogin.length" class="flex flex-col gap-4 w-full">
        <Divider align="center" class="mt-2! mb-0!" :pt="{ content: 'dark:bg-gray-800' }">
          <span class="px-2! text-surface-500 dark:text-surface-400 dark:bg-gray-800">{{ t('auth.login.or') }}</span>
        </Divider>
        <Button
          v-for="service in enabledExternalLogin"
          :key="service.service"
          :label="service.label"
          :icon="service.icon"
          class="btn btn-alt w-full mb-0"
          @click="handleOauthLogin(service.service)"
        />
      </div>

      <Divider />
      <Message severity="info" size="small" variant="simple">
        {{ t('auth.register.noAccount') }}
        <nuxt-link to="/auth/register" class="font-semibold mx-0.5">{{ t('auth.register.submit') }}</nuxt-link>
        {{ t('auth.register.noAccountSuffix') }}
      </Message>
      <Message severity="info" size="small" variant="simple">
        {{ t('auth.passwordReset.forgotPassword') }}
        <nuxt-link to="/auth/forget" class="font-semibold mx-0.5">{{ t('auth.passwordReset.shortName') }}</nuxt-link>
        {{ t('auth.passwordReset.forgotPasswordSuffix') }}
      </Message>
      <div class="absolute top-0 right-0">
        <div
          class="btn-back"
          @click="handleBack"
          :aria-label="t('app.back')"
        >
          <i class="pi pi-times"></i>
        </div>
      </div>
    </div>
    <slot />
  </div>
</template>