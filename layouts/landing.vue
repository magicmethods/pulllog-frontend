<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'
import { useOptionStore } from '~/stores/useOptionStore'
import { useI18n } from 'vue-i18n'
import { StorageUtil } from '~/utils/storage'

// Stores etc.
const userStore = useUserStore()
const optionStore = useOptionStore()
const appConfig = useConfig()
const { t, getLocaleCookie, setLocale } = useI18n()

// Refs & Local variables
const langOpt = ref()
const isDarkMode = ref<boolean>(userStore.user?.theme === 'dark')
const currentLanguage = ref<Language>((userStore.user?.language ?? getLocaleCookie() ?? appConfig.defaultLocale) as Language)
const storage = ref()
const showTerms = ref<boolean>(false) // 利用規約モーダル表示状態
const showPolicy = ref<boolean>(false) // プライバシーポリシーモーダル表示状態
const showContact = ref<boolean>(false) // お問い合わせモーダル表示状態

// Computed
const termSrc = computed(() => `/docs/terms_${currentLanguage.value}.md`)
const policySrc = computed(() => `/docs/privacy_policy_${currentLanguage.value}.md`)
const contactSrc = computed(() => `/docs/contact_${currentLanguage.value}.md`)

// Methods
async function handleThemeToggle(value: boolean) {
    isDarkMode.value = value
    // フロントUI更新
    const html = document.documentElement
    html.classList.add('theme-switching')
    html.classList.toggle('app-dark', value)
    void html.offsetWidth // Force reflow
    requestAnimationFrame(() => {
        html.classList.remove('theme-switching')
    })
    // ユーザーストア更新
    if (userStore.user) {
        userStore.user.theme = value ? 'dark' : 'light'
    }
    // ローカルストレージ更新
    storage.value.setItem('theme', value ? 'dark' : 'light')
}
function handleLangToggle(event: Event) {
    langOpt.value?.toggle(event)
}
function applyLocale(lang: Language) {
    // 言語設定を更新
    currentLanguage.value = lang
    setLocale(lang)
    // ユーザーストア更新
    if (userStore.user) {
        userStore.user.language = lang
    }
    langOpt.value?.toggle(false)
}

onMounted(() => {
    // マウント時のテーマ設定優先度は ローカルストレージ > ユーザーストア > ブラウザのレンダリングモード の順
    storage.value = new StorageUtil()
    const saved = storage.value.getItem('theme')
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    const html = document.documentElement
    html.classList.add('theme-switching')
    if (saved) {
        isDarkMode.value = saved === 'dark'
        html.classList.toggle('app-dark', isDarkMode.value)
    } else if (userStore.user) {
        isDarkMode.value = userStore.user.theme === 'dark'
        html.classList.toggle('app-dark', isDarkMode.value)
    } else if (prefersDarkMode) {
        html.classList.add('app-dark')
        isDarkMode.value = true
    }
    void html.offsetWidth // Force reflow
    requestAnimationFrame(() => {
        html.classList.remove('theme-switching')
    })
})

// Watchers
watch(
    () => userStore.user?.theme,
    (newTheme) => {
        isDarkMode.value = newTheme === 'dark'
        //  <html> のクラスを変更
        const html = document.documentElement
        html.classList.add('theme-switching')
        html.classList.toggle('app-dark', newTheme === 'dark')
        void html.offsetWidth // Force reflow
        requestAnimationFrame(() => {
            html.classList.remove('theme-switching')
        })
        // ローカルストレージも更新
        storage.value.setItem('theme', newTheme ?? 'light')
    }
)

const buttonClass = (addClass = '') => {
    const baseClass = 'btn btn-primary mb-0 hover:bg-primary-600/60 dark:hover:bg-primary-500/50 shrink-0'
    return [baseClass, addClass].join(' ').trim()
}

</script>

<template>
    <div class="min-h-screen max-w-screen flex flex-col bg-primary-500 text-white dark:bg-primary-600 dark:text-white">
        <Head>
            <Title>{{ t('app.name') }}</Title>
            <Meta name="description" :content="t('app.description')" />
            <Meta name="keywords" :content="t('app.keywords')" />
            <Meta name="google-adsense-account" :content="appConfig.adsenseAccount" />
        </Head>
        <CommonDocumentModal
            v-model:visible="showTerms"
            :src="termSrc"
            :title="t('app.termsTitle')"
            width="80vw"
            maxWidth="800px"
        />
        <CommonDocumentModal
            v-model:visible="showPolicy"
            :src="policySrc"
            :title="t('settingsDrawer.privacyPolicyTitle')"
            width="80vw"
            maxWidth="800px"
        />
        <CommonDocumentModal
            v-model:visible="showContact"
            :src="contactSrc"
            :title="t('landing.footer.contactUs')"
            width="80vw"
            maxWidth="800px"
        />
        <header
            class="sticky top-0 w-full flex items-center justify-between p-4 bg-primary-500 dark:bg-primary-600 z-50 overflow-x-clip"
            scrolled="border-b border-surface-500 dark:border-gray-900 bg-transparent"
        >
            <NuxtLink to="/" class="text-2xl font-bold flex items-center gap-2">
                <img src="/images/pulllog-icon.svg" alt="PullLog" class="h-8 w-8 ld ld-swim" />
                <span class="hidden sm:inline-block ml-0 sm:ml-2 tracking-tight">{{ t('app.name') }}</span>
            </NuxtLink>
            <nav class="flex m-0 p-0 items-center gap-1 sm:gap-2 min-w-0">
                <NuxtLink
                    to="/auth/register"
                    :class="buttonClass('w-8 sm:w-20 h-10')"
                >
                    <span class="pi pi-user-edit inline-block sm:hidden!"></span>
                    <span class="hidden sm:inline-block">{{ t('auth.register.pageName') }}</span>
                </NuxtLink>
                <NuxtLink
                    to="/auth/login"
                    :class="buttonClass('w-8 sm:w-20 h-10')"
                >
                    <span class="pi pi-sign-in inline-block sm:hidden!"></span>
                    <span class="hidden sm:inline-block">{{ t('auth.login.pageName') }}</span>
                </NuxtLink>
                <Button
                    label=""
                    :icon="`pi pi-${isDarkMode ? 'sun' : 'moon'}`"
                    iconPos="right"
                    @click="handleThemeToggle(!isDarkMode)"
                    :class="buttonClass('w-8 sm:w-12 h-10')"
                    v-blur-on-click
                />
                <Button
                    @click="handleLangToggle"
                    :class="buttonClass('btn-lang w-8 sm:w-auto h-10')"
                    v-blur-on-click
                >
                    <span class="pi pi-language"></span>
                    <span class="hidden sm:inline-block ml-0 sm:ml-0.5 font-semibold">{{ currentLanguage.toUpperCase() }}</span>
                </Button>
            </nav>
        </header>

        <Popover ref="langOpt" class="min-w-32" appendTo="body">
            <div class="w-full flex flex-col items-start">
                <ul class="list-none w-full p-0 m-0 flex flex-col text-sm">
                    <li v-for="lang in optionStore.languageOptions" :key="lang.value"
                        @click="applyLocale(lang.value as Language)"
                        class="flex items-center gap-2 px-2 py-3 hover:bg-emphasis cursor-pointer rounded-border"
                    >{{ lang.label }}</li>
                </ul>
            </div>
        </Popover>

        <main class="flex-1 flex flex-col items-center justify-start p-4 md:p-0 bg-gradient-to-b from-primary-500 to-primary-100 dark:from-primary-600 dark:to-gray-900">
            <slot />
        </main>

        <div id="landing-footer" class="h-max w-full bg-primary-100 text-surface-600 dark:bg-gray-900 dark:text-gray-400 text-sm">
            <div class="mx-auto py-4 flex flex-col justify-center items-center">
                <ul class="list-none m-0 p-0 flex gap-4 mb-2">
                    <li class="mb-2">
                        <NuxtLink
                            @click.prevent="showPolicy = true"
                            :aria-label="t('settingsDrawer.privacyPolicy')"
                            class="text-surface-600 hover:text-primary-500 dark:hover:text-primary-400 cursor-pointer"
                        >{{ t('landing.footer.privacyPolicy') }}</NuxtLink>
                    </li>
                    <li class="text-surface-400 select-none">|</li>
                    <li>
                        <NuxtLink
                            @click.prevent="showTerms = true"
                            :aria-label="t('app.termsLabel')"
                            class="text-surface-600 hover:text-primary-500 dark:hover:text-primary-400 cursor-pointer"
                        >{{ t('landing.footer.termsOfService') }}</NuxtLink>
                    </li>
                    <li class="hidden md:inline-block text-surface-400 select-none">|</li>
                    <li class="hidden md:inline-block">
                        <NuxtLink to="https://github.com/magicmethods/pulllog-docs" target="_blank" class="text-surface-600 hover:text-primary-500 dark:hover:text-primary-400">
                            {{ t('landing.footer.github') }}
                        </NuxtLink>
                    </li>
                    <li class="text-surface-400 select-none">|</li>
                    <li>
                        <NuxtLink
                            @click.prevent="showContact = true"
                            :aria-label="t('landing.footer.contactUs')"
                            class="text-surface-600 hover:text-primary-500 dark:hover:text-primary-400 cursor-pointer"
                        >{{ t('landing.footer.contactUs') }}</NuxtLink>
                    </li>
                    <template v-if="false">
                        <li class="text-surface-400 select-none">|</li>
                        <li>
                            <NuxtLink to="https://ka2.org/" target="_blank" class="text-surface-600 hover:text-primary-500 dark:hover:text-primary-400">
                                {{ t('landing.footer.blog') }}
                            </NuxtLink>
                        </li>
                    </template>
                </ul>
                <p>&copy; {{ new Date().getFullYear() }} {{ t('app.name') }} Project by MAGIC METHODS</p>
                <div class="flex items-center gap-6 mt-4 mb-0">
                    <NuxtLink
                        to="https://x.com/PullLog"
                        target="_blank"
                        class="text-surface-400"
                    ><span class="pi pi-twitter"></span></NuxtLink>
                    <NuxtLink
                        v-if="false"
                        to="https://www.reddit.com/user/pulllog"
                        target="_blank"
                        class="text-surface-400"
                    ><span class="pi pi-reddit"></span></NuxtLink>
                    <NuxtLink
                        v-if="false"
                        to="https://discord.com/invite/pulllog"
                        target="_blank"
                        class="text-surface-400"
                    ><span class="pi pi-discord"></span></NuxtLink>
                    <NuxtLink
                        to="https://github.com/magicmethods/pulllog-docs"
                        target="_blank"
                        class="inline-block sm:hidden text-surface-400"
                    ><span class="pi pi-github"></span></NuxtLink>
                </div>
            </div>
        </div>

        <CommonScrollToTopButton />
    </div>
</template>
