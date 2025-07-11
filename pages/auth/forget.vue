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
const { passwordReset } = useAuth()
const { t } = useI18n()

// Refs & Local variables
const email = ref<string>('')
const emailError = ref<string | null>(null)
const globalError = ref<string | null>(null)
const isTouched = ref<boolean>(false) // フィールドがタッチされたかどうか
const isSubmitting = ref<boolean>(false)
const isAccepted = ref<boolean>(false) // パスワードリセット申請受理状態
// Schema for form validation
const emailSchema = computed(() => z.string().email({ message: t('validation.emailInvalid') }))
const isFormValid = computed(() => emailSchema.value.safeParse(email.value).success)

// Methods
function validateEmail() {
    const result = emailSchema.value.safeParse(email.value)
    emailError.value = result.success ? null : result.error.issues[0]?.message
    return result.success
}
function handleBlur() {
    isTouched.value = true
    validateEmail()
}
async function handleSubmit() {
    emailError.value = null
    globalError.value = null
    if (!validateEmail()) return
    isSubmitting.value = true

    try {
        const msg = await passwordReset(email.value)
        if (!msg) throw new Error(t('auth.passwordReset.failed'))
        isAccepted.value = true
    } catch (e: unknown) {
        globalError.value = e instanceof Error ? e.message : t('auth.passwordReset.failed')
        console.error('Password reset failed:', e)
        isSubmitting.value = false
    } finally {
        if (!isAccepted.value) {
            email.value = '' // フォームをリセット
            emailError.value = null // エラーメッセージをリセット
            isTouched.value = false // タッチ状態をリセット
            await nextTick() // DOM更新を待つ
            isSubmitting.value = false
        }
    }
}
function handleBack() {
    navigateTo({ path: '/' })
}


</script>

<template>
    <div class="flex flex-col gap-12">
        <div class="relative flex flex-col gap-2 items-center mb-2">
            <h1 class="text-2xl font-bold mb-2">{{ t('app.name') }}</h1>
            <template v-if="isAccepted">
                <Message severity="success" size="large" variant="simple" class="my-4">
                    {{ t('auth.passwordReset.success') }}
                </Message>
                <p class="text-left text-surface-500 dark:text-gray-400 block mb-2">
                    {{ t('auth.passwordReset.confirmationEmailSent') }}
                </p>
            </template>
            <template v-else>
                <Message severity="info" size="normal" variant="simple" class="my-4">
                    {{ t('auth.passwordReset.forgotPasswordTitle') }}
                </Message>
                <p class="text-center text-surface-500 dark:text-gray-400 block mb-2">
                    {{ t('auth.passwordReset.prompt') }}<br>
                    {{ t('auth.passwordReset.instructions') }}
                </p>

                <form @submit.prevent="handleSubmit" class="flex flex-col gap-4 w-full max-w-sm" autocomplete="on">
                    <InputText
                        v-model="email"
                        inputmode="email"
                        :placeholder="t('auth.passwordReset.emailPlaceholder')"
                        class="flex-auto w-full"
                        autocomplete="username"
                        :class="{ 'p-invalid': isTouched && emailError }"
                        @blur="handleBlur()"
                    />
                    <Message v-if="isTouched && emailError" severity="error" size="small" variant="simple" class="mb-2">
                        {{ emailError }}
                    </Message>

                    <!-- グローバルエラー表示 -->
                    <Message v-if="globalError" severity="error" size="small" class="mb-2">
                        {{ globalError }}
                    </Message>

                    <div class="flex justify-end gap-2">
                        <Button
                            type="submit"
                            :label="t('auth.passwordReset.submit')"
                            class="btn btn-primary"
                            :disabled="isSubmitting || !isFormValid"
                            :loading="isSubmitting"
                        />
                    </div>
                </form>

                <Divider />
                <Message severity="info" size="small" variant="simple">
                    {{ t('auth.register.noAccount') }}
                    <nuxt-link to="/auth/register" class="font-semibold mx-0.5">{{ t('auth.register.submit') }}</nuxt-link>
                    {{ t('auth.register.noAccountSuffix') }}
                </Message>
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
    </div>
</template>
