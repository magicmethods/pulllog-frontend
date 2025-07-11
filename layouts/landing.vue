<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'
import { useI18n } from 'vue-i18n'
import { StorageUtil } from '~/utils/storage'

// Stores
const userStore = useUserStore()

// i18n
const { t, getLocaleCookie, setLocale } = useI18n()

// Refs & Local variables
const isDarkMode = ref<boolean>(userStore.user?.theme === 'dark')
const currentLanguage = ref<string>(userStore.user?.language ?? getLocaleCookie() ?? 'ja')
const storage = new StorageUtil()

// 必要に応じてグローバルCSSやSEO meta設定
definePageMeta({
    layout: 'landing',
    title: t('app.name'),
    meta: [
        { name: 'description', content: t('app.description') },
        { name: 'keywords', content: t('app.keywords') },
    ]
})

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
    storage.setItem('theme', value ? 'dark' : 'light')
}
function handleLangToggle() {
    // Toggle between 'ja' and 'en'
    const newLang = currentLanguage.value === 'ja' ? 'en' : 'ja'
    currentLanguage.value = newLang
    setLocale(newLang)
    // ユーザーストア更新
    if (userStore.user) {
        userStore.user.language = newLang
    }
}

onMounted(() => {
    // マウント時のテーマ設定優先度は ローカルストレージ > ユーザーストア > ブラウザのレンダリングモード の順
    const saved = storage.getItem('theme')
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
        storage.setItem('theme', newTheme ?? 'light')
    }
)


</script>

<template>
    <div class="min-h-screen flex flex-col bg-primary-500 text-white dark:bg-primary-600 dark:text-white">
        <!-- ヘッダー -->
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
            </nav>
        </header>

        <!-- メインコンテンツ -->
        <main class="flex-1 flex flex-col items-center justify-start p-4 bg-gradient-to-b from-primary-200 dark:from-gray-950 to-white dark:to-gray-800">
            <slot />
        </main>

        <!-- フッター -->
        <!-- footer class="landing-footer text-center py-8 text-gray-400 text-xs">
            &copy; {{ new Date().getFullYear() }} PullLog. All rights reserved.
        </footer -->
        <CommonFooter />
    </div>
</template>

<style lang="scss" scoped>
.landing-wrapper {
    font-family: 'Nunito', 'M PLUS Rounded 1c', sans-serif;
}
</style>
