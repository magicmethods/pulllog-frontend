<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { z } from "zod"
import { useAuth } from "~/composables/useAuth"

definePageMeta({
    layout: "auth",
})

// Stores & Composables etc.
const { verifyToken, updatePassword } = useAuth()
const { t } = useI18n()

// Refs & Local variables
const route = useRoute()
const token = ref<string>((route.query.token as string) || "")
const type = ref<VerifyType | "">((route.query.type as VerifyType) || "")
const code = ref<string>("")
const password = ref<string>("")
const isInitialized = ref<boolean>(false)
const verifying = ref<boolean>(false)
const verified = ref<boolean>(false)
const verifiedCode = ref<boolean>(false)
const error = ref<string | null>(null)
const codeError = ref<string | null>(null)
const passwordError = ref<string | null>(null)
// Schema for form validation
const verifySchema = computed(() =>
    z.object({
        code: z.string().length(6, { message: t("validation.invalidCode") }),
        password: z.string().min(8, { message: t("validation.shortPassword") }),
    }),
)

// Methods
async function handleUpdatePassword() {
    verifying.value = true
    try {
        // 認証コードの検証処理
        verifySchema.value.parse({
            code: code.value,
            password: password.value,
        })
        codeError.value = null
        passwordError.value = null

        const res: boolean = await updatePassword(
            token.value,
            type.value as "signup" | "reset",
            code.value,
            password.value,
        )
        if (!res) {
            throw new Error(t("auth.verify.passwordResetFailed"))
        }
        verifiedCode.value = true
    } catch (e: unknown) {
        if (e instanceof z.ZodError) {
            // Zodのバリデーションエラー
            if (e.issues.some((issue) => issue.path.includes("code"))) {
                codeError.value = e.message
            } else if (
                e.issues.some((issue) => issue.path.includes("password"))
            ) {
                passwordError.value = e.message
            }
        } else {
            console.error("Reset Password Error:", e)
            codeError.value =
                e instanceof Error ? e.message : t("auth.verify.unknownError")
        }
        return
    } finally {
        verifying.value = false
    }
}
function handleBack() {
    navigateTo({ path: "/" })
}

// Lifecycle hooks
onMounted(async () => {
    // クエリパラメータの検証
    if (!token.value || (type.value !== "signup" && type.value !== "reset")) {
        error.value = t("auth.verify.invalidAccess")
        return
    }
    verifying.value = true
    try {
        // バックエンドAPIへtoken, typeで認証リクエスト
        const res: boolean = await verifyToken(
            token.value,
            type.value as "signup" | "reset",
        )
        if (!res) {
            throw new Error(t("auth.verify.failed"))
        }
        verified.value = true
    } catch (e: unknown) {
        console.error("Verification error:", e)
        error.value = `${t("auth.verify.invalidAccess")}<br>${e instanceof Error ? e.message : ""}`
    } finally {
        verifying.value = false
        isInitialized.value = true
    }
})
</script>

<template>
    <div class="flex flex-col gap-12">
        <Head>
            <Title>{{ `${t('auth.verify.title')} | ${t('app.name')}` }}</Title>
        </Head>
        <div class="relative flex flex-col gap-2 items-center mb-2">
            <h1 class="text-2xl font-bold mb-2">{{ t('app.name') }}</h1>

            <div class="auth-verify">
                <div v-if="verified" class="flex flex-col justify-center items-center gap-4">
                    <template v-if="type === 'signup'">
                        <p class="text-success">{{ t('auth.verify.signupSuccess') }}</p>
                        <p class="text-surface-600 dark:text-surface-400 mb-4">
                            {{ t('auth.verify.promptPrefix') }}
                            <nuxt-link to="/auth/login" class="font-semibold text-link mx-0.5">{{ t('auth.login.submit') }}</nuxt-link>
                            {{ t('auth.verify.promptSuffix') }}
                        </p>
                    </template>
                    <template v-else-if="type === 'reset'">
                        <template v-if="verifiedCode">
                            <p class="text-success">{{ t('auth.verify.resetSuccess') }}</p>
                            <p class="text-surface-600 dark:text-surface-400 mb-4">
                                {{ t('auth.verify.promptPrefix') }}
                                <nuxt-link to="/auth/login" class="font-semibold text-link mx-0.5">{{ t('auth.login.submit') }}</nuxt-link>
                                {{ t('auth.verify.promptSuffix') }}
                            </p>
                        </template>
                        <template v-else>
                            <p class="text-info">{{ t('auth.verify.resetPrompt') }}</p>
                            <p>
                                {{ t('auth.verify.inputPromptPrefix') }}
                                <strong class="text-amber-500 dark:text-yellow-600 mx-0.5">{{ t('auth.verify.code') }}</strong>
                                {{ t('auth.verify.inputPromptSuffix') }}
                            </p>
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
                            <p>{{ t('auth.verify.newPasswordPrompt') }}</p>
                            <div class="w-full flex flex-col justify-center items-center gap-4 mb-4">
                                <Password
                                    v-model="password"
                                    :promptLabel="t('auth.register.passwordPrompt')"
                                    :weakLabel="t('auth.register.weakLabel')"
                                    :mediumLabel="t('auth.register.mediumLabel')"
                                    :strongLabel="t('auth.register.strongLabel')"
                                    :placeholder="t('auth.register.passwordPlaceholder')"
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
                                :label="verifying ? t('auth.verify.verifying') : t('auth.verify.submit')"
                                @click="handleUpdatePassword"
                                :disabled="verifying || !code || code.length < 6 || !password || password.length < 8"
                                :loading="verifying"
                                class="btn btn-primary mb-0"
                            />
                        </template>
                    </template>
                </div>
                <div v-else-if="!isInitialized" class="flex flex-col justify-center items-center m-auto">
                    <p class="text-muted">{{ t('auth.verify.loading') }}</p>
                </div>
                <div v-else-if="error" class="flex flex-col justify-center items-center gap-4 mb-4">
                    <p class="text-danger text-center my-2" v-html="error"></p>
                </div>
            </div>
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