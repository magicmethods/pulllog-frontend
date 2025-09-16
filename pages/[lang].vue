<script setup lang="ts">
/**
 * /{ja|en|zh} 直アクセス時の言語切替とリダイレクト。
 * - 処理内容は layouts/landing.vue のプルダウン変更時（applyLocale）と同等：
 *   - `setLocale(lang)` を呼び、i18n のロケールと Cookie（pulllog-lang）を更新
 *   - ログイン済みなら userStore.user.language も更新
 *   - その後 `/` に replace リダイレクト
 */

definePageMeta({
    layout: "landing",
})

const route = useRoute()
const { setLocale, locale } = useI18n()
const userStore = useUserStore()

const supported = ["ja", "en", "zh"] as const
type Supported = (typeof supported)[number]

/** パラメータからロケールを解決（未対応は 'ja' にフォールバック） */
function resolveLocale(param: unknown): Supported {
    const val = String(param || "").toLowerCase()
    if (val === "en") return "en"
    if (val === "zh") return "zh"
    return "ja"
}

const target = resolveLocale(route.params.lang)

// i18n を更新（Cookieは後続で明示設定も行う）
await setLocale(target)
locale.value = target

// Cookie を明示的に更新（環境差異で setLocale の自動書き込みが効かないケースをケア）
const langCookie = useCookie<string>("pulllog-lang", {
    path: "/",
    sameSite: "lax",
    secure: !process.dev,
    maxAge: 60 * 60 * 24 * 365, // 1年
})
langCookie.value = target

// ユーザー設定も同等に更新
if (userStore.user) {
    userStore.user.language = target
}

await navigateTo("/", { replace: true })
</script>

<template>
  <!-- クライアント側で即時リダイレクトするため表示は空 -->
  <div />
  
</template>
