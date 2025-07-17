<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'
import { useOptionStore } from '~/stores/useOptionStore'
import { useI18n } from 'vue-i18n'
import { StorageUtil } from '~/utils/storage'

// Stores
const userStore = useUserStore()
const optionStore = useOptionStore()
const appConfig = useConfig()

// i18n
const { t, getLocaleCookie, setLocale } = useI18n()

// Refs & Local variables
const langOpt = ref()
const isDarkMode = ref<boolean>(userStore.user?.theme === 'dark')
const currentLanguage = ref<Language>((userStore.user?.language ?? getLocaleCookie() ?? appConfig.defaultLocale) as Language)
const storage = ref()

// Methods
function handleThemeToggle(value: boolean) {
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


</script>

<template>
    <div class="min-h-screen flex flex-col bg-primary-500 text-white dark:bg-primary-600 dark:text-white">
        <Head>
            <Title>{{ t('app.name') }}</Title>
            <Meta name="description" :content="t('app.description')" />
            <Meta name="keywords" :content="t('app.keywords')" />
        </Head>
        <header class="flex items-center justify-between p-4 border-b border-surface-400 dark:border-gray-900 bg-transparent shadow-md">
            <NuxtLink to="/" class="text-2xl font-bold flex items-center gap-2">
                <img src="/images/pulllog-icon.svg" alt="PullLog" class="h-8 w-8" />
                <span class="tracking-tight">{{ t('app.name') }}</span>
            </NuxtLink>
            <nav class="flex m-0 p-0 items-center gap-2">
                <NuxtLink
                    to="/auth/register"
                    class="btn btn-primary mb-0 w-24 hover:bg-primary-600/60 dark:hover:bg-primary-500/50"
                >
                    {{ t('auth.register.pageName') }}
                </NuxtLink>
                <NuxtLink
                    to="/auth/login"
                    class="btn btn-primary mb-0 w-24 hover:bg-primary-600/60 dark:hover:bg-primary-500/50"
                >
                    {{ t('auth.login.pageName') }}
                </NuxtLink>
                <Button
                    label=""
                    :icon="`pi pi-${isDarkMode ? 'sun' : 'moon'}`"
                    iconPos="right"
                    @click="handleThemeToggle(!isDarkMode)"
                    class="btn btn-primary mb-0 w-12 hover:bg-primary-600/60 dark:hover:bg-primary-500/50"
                    v-blur-on-click
                />
                <Button
                    :label="`${currentLanguage}`"
                    icon="pi pi-language"
                    @click="handleLangToggle"
                    class="btn btn-primary mb-0 w-20 hover:bg-primary-600/60 dark:hover:bg-primary-500/50"
                    v-blur-on-click
                />
                <Popover ref="langOpt">
                    <div class="flex flex-col items-start">
                        <ul class="list-none p-0 m-0 flex flex-col">
                            <li v-for="lang in optionStore.languageOptions" :key="lang.value"
                                @click="applyLocale(lang.value as Language)"
                                class="flex items-center gap-2 px-2 py-3 hover:bg-emphasis cursor-pointer rounded-border"
                            >{{ lang.label }}</li>
                        </ul>
                    </div>
                </Popover>
            </nav>
        </header>

        <main class="flex-1 flex flex-col items-center justify-start p-4 bg-gradient-to-b from-primary-200 dark:from-gray-950 to-white dark:to-gray-800">
            <slot />
        </main>

        <CommonFooter />
    </div>
</template>

<style lang="scss" scoped>
.landing-wrapper {
    font-family: 'Nunito', 'M PLUS Rounded 1c', sans-serif;
}
</style>
