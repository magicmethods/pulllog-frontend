<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'
import { useI18n } from 'vue-i18n'
import { StorageUtil } from '~/utils/storage'

// Stores etc.
const userStore = useUserStore()
const appConfig = useConfig()
const { t } = useI18n()

// Refs & Local variables
const isDarkMode = ref<boolean>(userStore.user?.theme === 'dark')
const isDrawerOpen = ref<boolean>(false)
const mainContainer = ref<HTMLElement | null>(null)
const headerReloadKey = ref<number>(0)
const reloadFABKey = ref<number>(0)
const storage = ref()

// Router
const router = useRouter()
// Watch page transitions and reset scroll position
router.afterEach(() => {
    if (mainContainer.value) {
        mainContainer.value.scrollTop = 0
        mainContainer.value.scrollLeft = 0
    }
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
    storage.value.setItem('theme', value ? 'dark' : 'light')
}
function openDrawer() {
    isDrawerOpen.value = true
}
function closeDrawer() {
    isDrawerOpen.value = false
}

// Lifecycle hooks
onMounted(() => {
    storage.value = new StorageUtil()
    // マウント時のテーマ設定優先度は ローカルストレージ > ユーザーストア > ブラウザのレンダリングモード の順
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
        reloadFABKey.value++ // Reload FAB to ensure it reflects the theme
    })
})

// Watchers
watch(
    () => userStore.user?.theme,
    (newTheme) => {
        isDarkMode.value = newTheme === 'dark'
        headerReloadKey.value++
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
    <div id="app-container">
        <Head>
            <Title>{{ t('app.name') }}</Title>
            <Meta name="description" :content="t('app.description')" />
            <Meta name="keywords" :content="t('app.keywords')" />
            <Meta name="google-adsense-account" :content="appConfig.adsenseAccount" />
        </Head>
        <CommonHeader
            :isDarkMode="isDarkMode"
            @update:isDarkMode="handleThemeToggle"
            @open-settings="openDrawer"
            :key="headerReloadKey"
        />
        <!-- Drawer -->
        <Drawer
            v-model:visible="isDrawerOpen"
            position="right"
            :header="t('settingsDrawer.header')"
        >
            <SettingsDrawerContent @close="closeDrawer" />
        </Drawer>
        <main
            ref="mainContainer"
            class="w-full flex flex-col justify-between overflow-y-auto bg-white dark:bg-gray-900"
            style="height: calc(100vh - 60px);"
        >
            <slot />
            <CommonFooter />
        </main>
        <!-- Floating Action Button -->
        <CommonScrollToTopButton :target="mainContainer" :key="reloadFABKey" />
        <!-- Loader -->
        <Loader />
        <!-- Flush Notifications -->
        <Toast
            position="top-right"
            group="notices"
        />
    </div>
</template>