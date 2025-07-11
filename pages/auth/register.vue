<script setup lang="ts">
import { z } from 'zod'
import { useUserStore } from '~/stores/useUserStore'
import { useI18n } from 'vue-i18n'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
    layout: 'auth'
})

// Stores etc.
const userStore = useUserStore()
const { register } = useAuth()
const { t, locale, getLocaleCookie } = useI18n()

// Refs & Local variables
const form = reactive({
    name: '',
    email: '',
    password: '',
    isAgreed: false,
})
const errors = reactive<{ name?: string; email?: string; password?: string; isAgreed?: string }>({})
const globalError = ref<string | null>(null)
const currentLocale = ref<string>(userStore.user?.language ?? getLocaleCookie() ?? locale.value ?? 'ja')
const touched = reactive<{ name: boolean; email: boolean; password: boolean; isAgreed: boolean }>({
    name: false,
    email: false,
    password: false,
    isAgreed: false,
})
const isSubmitting = ref<boolean>(false)
const isMeterVisible = ref<boolean>(false) // パスワード強度インジケータ表示状態
const showTerms = ref<boolean>(false) // 利用規約モーダル表示状態
const isAccepted = ref<boolean>(false) // ユーザー登録が受理されたかどうか
// Schema for form validation
const registerSchema = computed(() => z.object({
    name: z.string().min(1, { message: t('validation.nameRequired') }).max(50, { message: t('validation.nameMaxLength') }),
    email: z.string().email({ message: t('validation.emailInvalid') }),
    password: z.string().min(8, { message: t('validation.shortPassword') }),
    isAgreed: z.literal(true, { errorMap: () => ({ message: t('validation.termsRequired') }) }),
}))

// Computed
const isFormValid = computed(() => registerSchema.value.safeParse(form).success)
const termSrc = computed(() => `/docs/terms_${currentLocale.value}.md`)
const docTitle = computed(() => t('app.termsTitle'))

// Methods
// 強度インジケータ開いた
function handlePasswordShow() {
    isMeterVisible.value = true
}
// 強度インジケータ閉じた
function handlePasswordHide() {
    isMeterVisible.value = false
}
// 指定フィールドのみバリデーション
function validateFields(fields: ('name' | 'email' | 'password' | 'isAgreed')[]) {
    for (const f of fields) {
        if (f !== 'isAgreed' && !form[f]) {
            errors[f] = undefined
            continue
        }
        touched[f] = true
        // 各項目だけzodでバリデーション
        const result = registerSchema.value.shape[f].safeParse(form[f])
        errors[f] = result.success ? undefined : result.error.issues[0]?.message
    }
    return fields.every(f => !errors[f])
}
// 全体バリデーション
function validateAll(): boolean {
    touched.name = true
    touched.email = true
    touched.password = true
    touched.isAgreed = true
    const result = registerSchema.value.safeParse(form)
    errors.name = undefined
    errors.email = undefined
    errors.password = undefined
    errors.isAgreed = undefined
    if (!result.success) {
        for (const issue of result.error.issues) {
            if (issue.path.length > 0) {
                const field = issue.path[0] as keyof typeof touched
                // 未入力でなければエラーをセット
                if (field === 'isAgreed' || form[field]) errors[field] = issue.message
            }
        }
        return false
    }
    return true
}
function handleBlur(field: 'name' | 'email') {
    touched[field] = true
    validateFields([field])
}
// 登録処理
async function handleRegister() {
    globalError.value = null
    if (!validateAll()) return
    isSubmitting.value = true
    try {
        await register(form.name, form.email, form.password)
        isAccepted.value = true
    } catch (e: unknown) {
        globalError.value = e instanceof Error ? e.message : t('auth.register.failed')
        console.error('Register failed:', e)
        isSubmitting.value = false
    } finally {
        if (isAccepted.value) {
          // 登録が受理された場合はフォームをリセット
          form.name = ''
          form.email = ''
          form.password = ''
          form.isAgreed = false
          touched.name = false
          touched.email = false
          touched.password = false
          touched.isAgreed = false
          await nextTick() // DOM更新を待つ
          isSubmitting.value = false
        }
    }
}
function handleBack() {
    navigateTo({ path: '/' })
}

// Watchers
watch(
    () => isMeterVisible.value,
    async (newValue) => {
        if (!newValue) {
            await nextTick()
            validateFields(['password'])
        }
    }
)

</script>

<template>
  <div class="flex flex-col gap-12">
    <!-- TermsModal v-model:visible="showTerms" /-->
    <CommonDocumentModal
      v-model:visible="showTerms"
      :src="termSrc"
      :title="docTitle"
      width="80vw"
      maxWidth="800px"
    />
    <div class="relative flex flex-col gap-2 items-center mb-2">
      <h1 class="text-2xl font-bold mb-2">{{ t('app.name') }}</h1>
      <template v-if="isAccepted">
        <Message severity="success" size="large" variant="simple" class="my-4">
          {{ t('auth.register.success') }}
        </Message>
        <p class="text-left text-surface-500 dark:text-gray-400 block mb-2">
          {{ t('auth.register.confirmationEmailSent') }}
        </p>
      </template>
      <template v-else>
        <p class="text-center text-surface-500 dark:text-gray-400 block mb-2">
          {{ t('auth.register.prompt') }}<br>
          {{ t('auth.register.instruction') }}
        </p>

        <form @submit.prevent="handleRegister" class="flex flex-col gap-4 w-full max-w-sm" autocomplete="on">
          <InputText
            v-model="form.name"
            inputmode="text"
            :placeholder="t('auth.register.namePlaceholder')"
            class="flex-auto w-full"
            autocomplete="nickname"
            :class="{ 'p-invalid': touched.name && errors.name }"
            @blur="handleBlur('name')"
          />
          <Message v-if="touched.name && errors.name" severity="error" size="small" variant="simple" class="mb-2">
            {{ errors.name }}
          </Message>

          <InputText
            v-model="form.email"
            inputmode="email"
            :placeholder="t('auth.register.emailPlaceholder')"
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
              :promptLabel="t('auth.register.passwordPrompt')"
              :weakLabel="t('auth.register.weakLabel')"
              :mediumLabel="t('auth.register.mediumLabel')"
              :strongLabel="t('auth.register.strongLabel')"
              :placeholder="t('auth.register.passwordPlaceholder')"
              toggleMask
              :minlength="8"
              class="flex-auto w-full"
              :pt:pcinputtext:root="{ inputmode: 'text', autocomplete: 'new-password',
                class: { 'p-invalid': touched.password && errors.password },
              }"
              @focus="handlePasswordShow"
              @focusout="handlePasswordHide"
          >
            <template #footer>
              <Divider :pt="{ root: 'opacity-50' }" />
              <span class="text-sm text-surface-500 dark:text-gray-400">{{ t('auth.register.passwordFooter') }}</span>
            </template>
          </Password>
          <Message v-if="touched.password && errors.password" severity="error" size="small" variant="simple" class="mb-2">
            {{ errors.password }}
          </Message>

          <div class="flex items-center gap-2 my-1">
            <Checkbox
              v-model="form.isAgreed"
              :binary="true"
              inputId="agree"
              @change="validateFields(['isAgreed'])"
            />
            <label for="agree" tabindex="0" class="font-normal text-base text-surface-500 dark:text-gray-400 select-none">
              <span>
                {{ t('auth.register.agreeTextPrefix') }}
                <NuxtLink
                  to="#"
                  @click.prevent="showTerms = true"
                  :aria-label="t('app.termsLabel')"
                  class="inline-flex flex-nowrap items-center gap-1 font-semibold hover:border-b hover:-mb-[1px] hover:text-primary-500 dark:hover:text-primary-600"
                >{{ t('app.termsLabel') }}<i class="pi pi-file-check text-sm"></i></NuxtLink>
                {{ t('auth.register.agreeTextSuffix') }}
              </span>
            </label>
          </div>
          <Message v-if="touched.isAgreed && errors.isAgreed" severity="error" size="small" variant="simple" class="-mt-3 mb-2">
            {{ errors.isAgreed }}
          </Message>

          <!-- グローバルエラー表示 -->
          <Message v-if="globalError" severity="error" size="small" class="mb-2">
            {{ globalError }}
          </Message>

          <div class="flex justify-end gap-2">
            <Button
              type="submit"
              :label="t('auth.register.submit')"
              class="btn btn-primary"
              :disabled="isSubmitting || !isFormValid"
              :loading="isSubmitting"
            />
          </div>
        </form>

        <Divider />
        <Message severity="info" size="small" variant="simple">
          {{ t('auth.login.hasAccount') }}
          <nuxt-link to="/auth/login" class="font-semibold mx-0.5">{{ t('auth.login.submit') }}</nuxt-link>
          {{ t('auth.login.hasAccountSuffix') }}
        </Message>
      </template>
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
