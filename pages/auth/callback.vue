<script setup lang="ts">
import { endpoints } from "~/api/endpoints"
//import { useAuth } from '~/composables/useAuth'
import { useAPI } from "~/composables/useAPI"
import { usePkce } from "~/composables/usePkce"
import { useGlobalStore } from "~/stores/globalStore"
import { useCsrfStore } from "~/stores/useCsrfStore"
import { useUserStore } from "~/stores/useUserStore"
import { deleteCookieAsync, setCookieAsync } from "~/utils/cookie"
import { toUser, toUserPlanLimits } from "~/utils/user"

definePageMeta({
    layout: "auth",
})

const route = useRoute()
const router = useRouter()
const { popVerifier, popState } = usePkce()
const { t } = useI18n()
//const { autoLogin } = useAuth()
const { callApi } = useAPI()
const userStore = useUserStore()
const csrfStore = useCsrfStore()
const globalStore = useGlobalStore()

const error = ref<string | null>(null)

onMounted(async () => {
    const code = typeof route.query.code === "string" ? route.query.code : null
    const stateRaw =
        typeof route.query.state === "string" ? route.query.state : null

    if (!code || !stateRaw) {
        error.value = t("auth.login.invalidResponse")
        return
    }

    // state 照合 & remember 抽出
    let remember = true
    try {
        const parsed = JSON.parse(stateRaw) as { s?: string; r?: number }
        const stateFromGoogle = typeof parsed.s === "string" ? parsed.s : null
        const storedState = popState()
        if (
            !storedState ||
            !stateFromGoogle ||
            storedState !== stateFromGoogle
        ) {
            error.value = t("auth.login.invalidResponse")
            return
        }
        remember = parsed.r === 1
    } catch {
        error.value = t("auth.login.invalidResponse")
        return
    }

    const verifier = popVerifier()
    if (!verifier) {
        error.value = t("auth.login.invalidResponse")
        return
    }

    try {
        // APIプロキシ経由でコード交換
        const res = await callApi<ExchangeResponse>({
            endpoint: endpoints.auth.googleExchange(),
            method: "POST",
            data: {
                code,
                code_verifier: verifier,
                redirect_uri: `${window.location.origin}/auth/callback`,
                remember,
            },
            // /auth 配下は CSRF 不要だが、callApi は自動で x-csrf-token を付ける
            // APIプロキシ側で mustCsrfToken=false にしているので問題はない
            timeout: 15,
            retries: 0,
        })

        if (!res || res.state !== "success" || !res.user) {
            throw new Error(res?.message || t("auth.login.failed"))
        }

        // サーバー側でセッション確立済み → 既存の autoLogin と同じ処理をここで実施
        // await autoLogin() → リメンバートークン未設定時にエラーになるためNG
        userStore.setUser(toUser(res.user), toUserPlanLimits(res.user))

        if (res.csrfToken) {
            csrfStore.setToken(res.csrfToken)
        }

        if (res.rememberToken && res.rememberTokenExpires) {
            await setCookieAsync("remember_token", res.rememberToken, {
                expires: new Date(res.rememberTokenExpires),
                path: "/",
                secure: true,
                sameSite: "lax",
            })
        } else {
            await deleteCookieAsync("remember_token", "/")
        }

        globalStore.setInitialized(true)
        navigateTo({ path: userStore.user?.homePage ?? "/apps" })
    } catch (e) {
        // サーバーからのエラー応答メッセージを出す
        const msg = e instanceof Error ? e.message : t("auth.login.failed")
        error.value = msg
    }
})
</script>

<template>
  <div class="flex items-center justify-center py-4">
    <div v-if="!error" class="loader-inner-container">
      <span class="loader-spinner h-8 w-8 mb-3"></span>
      <span class="loader-text text-base">{{ t('auth.login.signingIn') }}</span>
    </div>
    <div v-else class="text-center">
      <p class="text-red-500 mb-2">{{ error }}</p>
      <NuxtLink to="/auth/login" class="underline">{{ t('auth.login.backToLogin') }}</NuxtLink>
    </div>
  </div>
</template>
