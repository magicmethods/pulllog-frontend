<script setup lang="ts">
import { z } from 'zod'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
    layout: 'auth'
})

const emailSchema = z.string().email({ message: '有効なメールアドレスを入力してください' })

const { passwordReset } = useAuth()

const email = ref<string>('')
const emailError = ref<string | null>(null)
const globalError = ref<string | null>(null)
const isTouched = ref<boolean>(false) // フィールドがタッチされたかどうか
const isSubmitting = ref<boolean>(false)
const isAccepted = ref<boolean>(false) // パスワードリセット申請受理状態

const isFormValid = computed(() => emailSchema.safeParse(email.value).success)

function validateEmail() {
    const result = emailSchema.safeParse(email.value)
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
        if (!msg) throw new Error('パスワードリセットに失敗しました')
        isAccepted.value = true
    } catch (e: unknown) {
        globalError.value = e instanceof Error ? e.message : 'パスワードリセットに失敗しました。'
        console.error('Password reset failed:', e)
    } finally {
        isSubmitting.value = false
    }
}
function handleBack() {
    navigateTo({ path: '/' })
}


</script>

<template>
    <div class="flex flex-col gap-12">
        <div class="relative flex flex-col gap-2 items-center mb-2">
            <h1 class="text-2xl font-bold mb-2">PullLog</h1>
            <template v-if="isAccepted">
                <Message severity="success" size="large" variant="simple" class="my-4">
                    メールを送信しました
                </Message>
                <p class="text-left text-surface-500 dark:text-gray-400 block mb-2">
                ご登録いただいたメールアドレスにパスワードリセット用のメールを送信しました。
                メール内のリンクをクリックしてパスワードをリセットしてください。
                </p>
            </template>
            <template v-else>
                <Message severity="info" size="normal" variant="simple" class="my-4">
                    パスワードを忘れた場合
                </Message>
                <p class="text-left text-surface-500 dark:text-gray-400 block mb-2">
                    登録したメールアドレスを入力してください。<br>
                    パスワードリセットの手順をお送りします。
                </p>

                <form @submit.prevent="handleSubmit" class="flex flex-col gap-4 w-full max-w-sm" autocomplete="on">
                    <InputText
                        v-model="email"
                        inputmode="email"
                        placeholder="メールアドレス"
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
                            label="送信する"
                            class="btn btn-primary"
                            :disabled="isSubmitting || !isFormValid"
                        />
                    </div>
                </form>

                <Divider />
                <Message severity="info" size="small" variant="simple">
                    アカウントをお持ちでない方は<nuxt-link to="/auth/register" class="font-semibold">新規登録</nuxt-link>してください
                </Message>
                <Message severity="info" size="small" variant="simple">
                    すでにアカウントをお持ちの方は<nuxt-link to="/auth/login" class="font-semibold">ログイン</nuxt-link>してください
                </Message>
            </template>
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
    </div>
</template>
