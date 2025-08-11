<script setup lang="ts">
import { DateTime } from 'luxon'
import { useI18n } from 'vue-i18n'
import { useConsent } from '~/composables/useConsent'

// Persistence key
const STORAGE_KEY = 'pulllog-consent'

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
    updatedAt: ''
}

// Stores etc.
const { t, locale } = useI18n()

// States & Local variables
const visibleBanner = ref(false)
const visibleDialog = ref(false)
const prefs = ref<ConsentPrefs>({ ...defaultPrefs })
const visiblePolicy = ref<boolean>(false) // プライバシーポリシーモーダル表示状態
const policySrc = ref<string>(`/docs/privacy_policy_${locale.value}.md`)
const hasDecision = computed(() => prefs.value.updatedAt !== '')

// Consent API（gtag update call）
const { grant, deny } = useConsent()

// Storage I/O
const loadPrefs = (): ConsentPrefs | null => {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as ConsentPrefs
        if (typeof parsed.analytics !== 'boolean' || typeof parsed.ads !== 'boolean') return null
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
    if (typeof window === 'undefined') return
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
        updatedAt: DateTime.now().toISO()
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
        updatedAt: DateTime.now().toISO()
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
        updatedAt: DateTime.now().toISO()
    }
    prefs.value = next
    savePrefs(next)

    // 細分化した同意を gtag に反映
    if (prefs.value.analytics || prefs.value.ads) {
        // どれか1つでも true なら granted 側で上書き
        window.gtag?.('consent', 'update', {
            analytics_storage: prefs.value.analytics ? 'granted' : 'denied',
            ad_storage: prefs.value.ads ? 'granted' : 'denied'
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
        class="cookie-banner"
        role="dialog"
        aria-modal="false"
        aria-label="Cookie consent banner"
    >
        <div class="cookie-banner__body">
            <div class="cookie-banner__text text-sm">
                <p class="cookie-title">{{ t('cookieConsent.title') }}</p>
                <p class="cookie-desc">
                    {{ t('cookieConsent.description') }}
                    {{ t('cookieConsent.learnMorePrefix') }}
                    <NuxtLink @click.prevent="showPolicy" class="cookie-link cursor-pointer">{{ t('cookieConsent.privacyPolicy') }}</NuxtLink>
                    {{ t('cookieConsent.learnMoreSuffix') }}
                </p>
            </div>
            <div class="cookie-banner__actions">
                <Button
                    :label="t('cookieConsent.decline')"
                    severity="secondary"
                    size="small"
                    class="btn btn-secondary btn-sm"
                    @click="onDenyAll"
                />
                <Button
                    :label="t('cookieConsent.manage')"
                    severity="contrast"
                    size="small"
                    class="btn btn-alt btn-sm"
                    @click="visibleDialog = true"
                />
                <Button
                    :label="t('cookieConsent.acceptAll')"
                    size="small"
                    class="btn btn-primary btn-sm"
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
        <div class="cookie-dialog">
            <section class="cookie-section">
                <p class="cookie-section__title">{{ t('cookieConsent.requiredCookies') }}</p>
                <p class="cookie-section__desc">
                    {{ t('cookieConsent.requiredCookiesDesc') }}
                </p>
            </section>

            <Divider />

            <section class="cookie-section">
                <div class="cookie-row">
                    <Checkbox
                        inputId="ck-analytics"
                        :binary="true"
                        v-model="prefs.analytics"
                    />
                    <label for="ck-analytics" class="cookie-label">
                        {{ t('cookieConsent.analytics') }}
                    </label>
                </div>
                <p class="cookie-section__desc">
                    {{ t('cookieConsent.analyticsDesc') }}
                </p>
            </section>

            <Divider />

            <section class="cookie-section">
                <div class="cookie-row">
                    <Checkbox
                        inputId="ck-ads"
                        :binary="true"
                        v-model="prefs.ads"
                    />
                    <label for="ck-ads" class="cookie-label">
                        {{ t('cookieConsent.ads') }}
                    </label>
                </div>
                <p class="cookie-section__desc">
                    {{ t('cookieConsent.adsDesc') }}
                </p>
            </section>

            <Divider />

            <p class="text-xs mt-2">
                {{ t('cookieConsent.noticePrefix') }}
                <NuxtLink @click.prevent="showPolicy" class="cookie-link cursor-pointer">{{ t('cookieConsent.privacyPolicy') }}</NuxtLink>
                {{ t('cookieConsent.noticeSuffix') }}
            </p>
        </div>

        <template #footer>
            <div class="cookie-footer flex items-center justify-between">
                <div class="cookie-footer__right flex items-center gap-2">
                    <Button
                        :label="t('cookieConsent.decline')"
                        severity="secondary"
                        class="btn btn-secondary"
                        @click="onDenyAll"
                    />
                    <Button
                        :label="t('cookieConsent.saveSelection')"
                        severity="contrast"
                        class="btn btn-alt"
                        @click="onSaveSelection"
                    />
                    <Button
                        :label="t('cookieConsent.acceptAll')"
                        class="btn btn-primary"
                        @click="onAcceptAll"
                    />
                </div>
            </div>
        </template>
    </Dialog>
</template>

<style lang="scss" scoped>
.cookie-banner {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 60;
    background: color-mix(in srgb, #111 88%, transparent);
    color: #fff;
    padding: 16px;

    .cookie-banner__body {
        margin: 0 auto;
        max-width: 1080px;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 16px;
        align-items: center;
    }

    .cookie-banner__text {
        .cookie-title {
            font-weight: 700;
            margin: 0 0 4px 0;
            line-height: 1.4;
        }
        .cookie-desc {
            margin: 0;
            line-height: 1.6;
            opacity: .9;
        }
    }

    .cookie-banner__actions {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        justify-content: end;
    }

    .cookie-link {
        text-decoration: underline;
        text-underline-offset: 2px;
    }
}

.cookie-dialog {
    .cookie-section {
        margin: 8px 0 12px 0;

        &__title {
            font-weight: 700;
            margin: 0 0 4px 0;
        }
        &__desc {
            margin: 4px 0 0 28px;
            opacity: .85;
            line-height: 1.6;
        }
    }

    .cookie-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .cookie-label {
        font-weight: 600;
    }

    .cookie-footer {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        align-items: center;

        &__right {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
    }

    .cookie-link {
        text-decoration: underline;
        text-underline-offset: 2px;
    }
}
</style>
