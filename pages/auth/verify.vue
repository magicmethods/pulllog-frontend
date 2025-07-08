<script setup lang="ts">
import { z } from 'zod'
import { useAuth }  from '~/composables/useAuth'

// Types
type VerifyType = 'signup' | 'reset'
type VerifyResponse = {
    success: boolean
    message?: string
}

definePageMeta({
    layout: 'auth'
})

// Composables
const { verifyToken, updatePassword } = useAuth()

// Refs & Local variables
const route = useRoute()
const token = ref<string>(route.query.token as string || '')
const type = ref<VerifyType | ''>(route.query.type as VerifyType || '')
const code = ref<string>('')
const password = ref<string>('')
const verifying = ref<boolean>(false)
const verified = ref<boolean>(false)
const verifiedCode = ref<boolean>(false)
const error = ref<string | null>(null)
const codeError = ref<string | null>(null)
const passwordError = ref<string | null>(null)

// Methods
async function handleUpdatePassword() {
    verifying.value = true
    try {
        // 認証コードの検証処理
        z.string().length(6).parse(code.value)
        z.string().min(8, '8文字以上で入力してください').parse(password.value)
        codeError.value = null
        passwordError.value = null

        const res: boolean = await updatePassword(
            token.value,
            type.value as 'signup' | 'reset',
            code.value,
            password.value
        )
        if (!res) {
            throw new Error('パスワードの再設定に失敗しました')
        }
        verifiedCode.value = true
    } catch (e: unknown) {
        if (e instanceof z.ZodError) {
            // Zodのバリデーションエラー
            if (e.issues.some(issue => issue.path.includes('code'))) {
                codeError.value = e.message
            } else if (e.issues.some(issue => issue.path.includes('password'))) {
                passwordError.value = e.message
            }
        } else {
            console.error('Reset Password Error:', e)
            codeError.value = e instanceof Error ? e.message : '不明なエラーが発生しました'
        }
        return
    } finally {
        verifying.value = false
    }
}
function handleBack() {
  navigateTo({ path: '/' })
}

// Lifecycle hooks
onMounted(async () => {
    // クエリパラメータの検証
    if (!token.value || (type.value !== 'signup' && type.value !== 'reset')) {
        error.value = '無効なアクセスです'
        return
    }
    verifying.value = true
    try {
        // バックエンドAPIへtoken, typeで認証リクエスト
        const res: boolean = await verifyToken(token.value, type.value as 'signup' | 'reset')
        if (!res) {
            throw new Error('認証に失敗しました')
        }
        verified.value = true
    } catch (e: unknown) {
        console.error('認証エラー:', e)
        //error.value = e instanceof Error ? e.message : '不明なエラーが発生しました'
        error.value = `無効なアクセスです<br>${e instanceof Error ? e.message : ''}`
    } finally {
        verifying.value = false
    }
})

</script>

<template>
    <div class="flex flex-col gap-12">
        <div class="relative flex flex-col gap-2 items-center mb-2">
            <h1 class="text-2xl font-bold mb-2">PullLog</h1>

            <div class="auth-verify">
                <div v-if="verified" class="flex flex-col justify-center items-center gap-4">
                    <template v-if="type === 'signup'">
                        <p class="text-success">アカウントが有効になりました</p>
                        <p class="text-surface-600 dark:text-surface-400 mb-4">
                            こちらから<nuxt-link to="/auth/login" class="font-semibold text-link mx-1">ログイン</nuxt-link>してください
                        </p>
                    </template>
                    <template v-else-if="type === 'reset'">
                        <template v-if="verifiedCode">
                            <p class="text-success">パスワードの再設定が完了しました</p>
                            <p class="text-surface-600 dark:text-surface-400 mb-4">
                                こちらから<nuxt-link to="/auth/login" class="font-semibold text-link mx-1">ログイン</nuxt-link>してください
                            </p>
                        </template>
                        <template v-else>
                            <p class="text-info">パスワードの再設定を行います</p>
                            <p>メール記載の<strong class="text-amber-500 dark:text-yellow-600 mx-0.5">認証コード</strong>を入力してください</p>
                            <div class="flex flex-col justify-center items-center gap-4 mb-4">
                                <InputOtp v-model="code" :length="6">
                                    <template #default="{ attrs, events }">
                                        <input
                                            type="tel"
                                            inputmode="numeric"
                                            v-bind="attrs"
                                            v-on="events"
                                            class="custom-otp-input"
                                            autocomplete="one-time-code"
                                        />
                                    </template>
                                </InputOtp>
                                <Message v-if="codeError" severity="error" class="w-full px-2">
                                    {{ codeError }}
                                </Message>
                            </div>
                            <p>新しいパスワードを入力してください</p>
                            <div class="w-full flex flex-col justify-center items-center gap-4 mb-4">
                                <Password
                                    v-model="password"
                                    promptLabel="Choose a password"
                                    weakLabel="Too simple"
                                    mediumLabel="Average complexity"
                                    strongLabel="Complex password"
                                    placeholder="Enter new password"
                                    toggleMask
                                    :minlength="8"
                                    :pt:root="'w-full'"
                                    :pt:pcinputtext:root="{ inputmode: 'text', autocomplete: 'current-password',
                                        class: { 'p-invalid': !!passwordError },
                                    }"
                                />
                                <Message v-if="passwordError" severity="error" class="w-full px-2">
                                    {{ passwordError }}
                                </Message>
                            </div>
                            <!-- Divider / -->
                            <Button
                                :label="verifying ? '設定中...' : '設定する'"
                                @click="handleUpdatePassword"
                                :disabled="verifying || !code || code.length < 6 || !password || password.length < 8"
                                :loading="verifying"
                                class="btn btn-primary mb-0"
                            />
                        </template>
                    </template>
                </div>
                <div v-else-if="error" class="flex flex-col justify-center items-center gap-4 mb-4">
                    <p class="text-danger text-center my-2" v-html="error"></p>
                </div>
            </div>
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

<style lang="scss" scoped>
.custom-otp-input {
    width: 40px;
    font-size: 36px;
    border: 0 none;
    appearance: none;
    text-align: center;
    transition: all 0.2s;
    background: transparent;
    border-bottom: 2px solid var(--p-surface-300);

    &:focus {
        outline: 0 none;
        border-bottom-color: var(--p-primary-500);
    }
}
.app-dark {
    .custom-otp-input {
        border-bottom-color: var(--p-gray-700);
    }

    &:focus {
        border-bottom-color: var(--p-primary-400);
    }
}
</style>