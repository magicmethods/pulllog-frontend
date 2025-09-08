<script setup lang="ts">
import { DateTime } from "luxon"
import { useI18n } from "vue-i18n"
import { useConsent } from "~/composables/useConsent"

// Persistence key
const STORAGE_KEY = "pulllog-consent"

// Types
type ConsentPrefs = {
    analytics: boolean
    ads: boolean
    updatedAt: string
}

// Default value (all initially displayed as rejected)
const defaultPrefs: ConsentPrefs = {
    analytics: false,
    ads: false,
    updatedAt: "",
}

// Stores etc.
const { t, locale } = useI18n()

// States & Local variables
const visibleBanner = ref(false)
const visibleDialog = ref(false)
const prefs = ref<ConsentPrefs>({ ...defaultPrefs })
const visiblePolicy = ref<boolean>(false) // プライバシーポリシーモーダル表示状態
const policySrc = ref<string>(`/docs/privacy_policy_${locale.value}.md`)
const hasDecision = computed(() => prefs.value.updatedAt !== "")

// Consent API（gtag update call）
const { grant, deny } = useConsent()

// Storage I/O
const loadPrefs = (): ConsentPrefs | null => {
    if (typeof window === "undefined") return null
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as ConsentPrefs
        if (
            typeof parsed.analytics !== "boolean" ||
            typeof parsed.ads !== "boolean"
        )
            return null
        return parsed
    } catch {
        return null
    }
}

function showPolicy() {
    //console.log('Showing privacy policy modal:', locale.value)
    // プライバシーポリシーのソースを更新
    policySrc.value = `/docs/privacy_policy_${locale.value}.md`
    // プライバシーポリシーモーダルを表示
    visiblePolicy.value = true
}

const savePrefs = (next: ConsentPrefs) => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

// Lifecycle hooks
onMounted(() => {
    // 画面表示時に既存設定を読み込み
    const existing = loadPrefs()
    if (existing) {
        prefs.value = existing
        // 既に選択済みならバナーは出さない
        visibleBanner.value = false
        // gtag へ反映（FCP後でも問題なし）
        if (existing.analytics || existing.ads) {
            grant()
        } else {
            deny()
        }
    } else {
        // 未設定ならバナー表示
        visibleBanner.value = true
    }
})

// Methods
const onDenyAll = () => {
    // 「すべて拒否」
    const next: ConsentPrefs = {
        analytics: false,
        ads: false,
        updatedAt: DateTime.now().toISO(),
    }
    prefs.value = next
    savePrefs(next)
    deny()
    visibleBanner.value = false
    visibleDialog.value = false
}
const onAcceptAll = () => {
    // 「すべて許可」
    const next: ConsentPrefs = {
        analytics: true,
        ads: true,
        updatedAt: DateTime.now().toISO(),
    }
    prefs.value = next
    savePrefs(next)
    grant()
    visibleBanner.value = false
    visibleDialog.value = false
}
const onSaveSelection = () => {
    // 「選択を保存」（詳細設定）
    const next: ConsentPrefs = {
        analytics: prefs.value.analytics,
        ads: prefs.value.ads,
        updatedAt: DateTime.now().toISO(),
    }
    prefs.value = next
    savePrefs(next)

    // 細分化した同意を gtag に反映
    if (prefs.value.analytics || prefs.value.ads) {
        // どれか1つでも true なら granted 側で上書き
        window.gtag?.("consent", "update", {
            analytics_storage: prefs.value.analytics ? "granted" : "denied",
            ad_storage: prefs.value.ads ? "granted" : "denied",
        })
    } else {
        deny()
    }

    visibleBanner.value = false
    visibleDialog.value = false
}
</script>

<template>
    <!-- バナー（未選択時のみ） -->
    <div
        v-if="visibleBanner"
        class="fixed inset-x-0 bottom-0 z-[60] bg-black/80 text-white p-4"
        role="dialog"
        aria-modal="false"
        aria-label="Cookie consent banner"
    >
        <div class="max-w-[1080px] mx-auto grid grid-cols-1 gap-4 items-center md:grid-cols-[1fr_auto]">
            <div class="text-sm">
                <p class="font-bold leading-snug mb-1">{{ t('cookieConsent.title') }}</p>
                <p class="m-0 leading-relaxed opacity-90">
                    {{ t('cookieConsent.description') }}
                    {{ t('cookieConsent.learnMorePrefix') }}
                    <NuxtLink
                        @click.prevent="showPolicy"
                        class="underline underline-offset-2 cursor-pointer"
                    >
                        {{ t('cookieConsent.privacyPolicy') }}
                    </NuxtLink>
                    {{ t('cookieConsent.learnMoreSuffix') }}
                </p>
            </div>
            <div class="flex flex-wrap items-center gap-2 justify-stretch md:justify-end">
                <Button
                    :label="t('cookieConsent.decline')"
                    severity="secondary"
                    size="small"
                    class="btn btn-secondary btn-sm w-full sm:w-auto"
                    @click="onDenyAll"
                />
                <Button
                    :label="t('cookieConsent.manage')"
                    severity="contrast"
                    size="small"
                    class="btn btn-alt btn-sm w-full sm:w-auto"
                    @click="visibleDialog = true"
                />
                <Button
                    :label="t('cookieConsent.acceptAll')"
                    size="small"
                    class="btn btn-primary btn-sm w-full sm:w-auto"
                    @click="onAcceptAll"
                />
            </div>
        </div>
    </div>

    <CommonDocumentModal
        v-model:visible="visiblePolicy"
        :src="policySrc"
        :title="t('cookieConsent.privacyPolicyTitle')"
        width="80vw"
        maxWidth="800px"
    />

    <!-- 詳細設定モーダル -->
    <Dialog
        v-model:visible="visibleDialog"
        modal
        :header="t('cookieConsent.detailsHeader')"
        :style="{ width: '560px', maxWidth: '92vw' }"
        :breakpoints="{ '768px': '92vw' }"
    >
        <div class="space-y-3">
            <section class="my-2">
                <p class="font-bold mb-1">{{ t('cookieConsent.requiredCookies') }}</p>
                <p class="mt-1 leading-6 opacity-80">
                    {{ t('cookieConsent.requiredCookiesDesc') }}
                </p>
            </section>

            <Divider />

            <section class="my-2">
                <div class="flex items-center gap-2">
                    <Checkbox
                        inputId="ck-analytics"
                        :binary="true"
                        v-model="prefs.analytics"
                    />
                    <label for="ck-analytics" class="font-semibold">
                        {{ t('cookieConsent.analytics') }}
                    </label>
                </div>
                <p class="mt-1 leading-6 opacity-80 ml-7">
                    {{ t('cookieConsent.analyticsDesc') }}
                </p>
            </section>

            <Divider />

            <section class="my-2">
                <div class="flex items-center gap-2">
                    <Checkbox
                        inputId="ck-ads"
                        :binary="true"
                        v-model="prefs.ads"
                    />
                    <label for="ck-ads" class="cookie-label">
                        {{ t('cookieConsent.ads') }}
                    </label>
                </div>
                <p class="mt-1 leading-6 opacity-80 ml-7">
                    {{ t('cookieConsent.adsDesc') }}
                </p>
            </section>

            <Divider />

            <p class="text-xs mt-2">
                {{ t('cookieConsent.noticePrefix') }}
                <NuxtLink
                    @click.prevent="showPolicy"
                    class="underline underline-offset-2 cursor-pointer cursor-pointer"
                >
                    {{ t('cookieConsent.privacyPolicy') }}
                </NuxtLink>
                {{ t('cookieConsent.noticeSuffix') }}
            </p>
        </div>

        <template #footer>
            <div class="grid grid-cols-1 gap-3 items-center sm:grid-cols-[1fr_auto]">
                <div class="flex items-center gap-2 flex-wrap justify-stretch sm:justify-end">
                    <Button
                        :label="t('cookieConsent.decline')"
                        severity="secondary"
                        class="btn btn-secondary w-full sm:w-auto"
                        @click="onDenyAll"
                    />
                    <Button
                        :label="t('cookieConsent.saveSelection')"
                        severity="contrast"
                        class="btn btn-alt w-full sm:w-auto"
                        @click="onSaveSelection"
                    />
                    <Button
                        :label="t('cookieConsent.acceptAll')"
                        class="btn btn-primary w-full sm:w-auto"
                        @click="onAcceptAll"
                    />
                </div>
            </div>
        </template>
    </Dialog>
</template>
