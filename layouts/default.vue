<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'
import { StorageUtil } from '~/utils/storage'

// Stores
const userStore = useUserStore()

// Refs & Local variables
const isDarkMode = ref<boolean>(userStore.user?.theme === 'dark')
const isDrawerOpen = ref<boolean>(false)
const mainContainer = ref<HTMLElement | null>(null)
const headerReloadKey = ref<number>(0)
const storage = new StorageUtil()

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
        // userStore.updateTheme(value ? 'dark' : 'light')
    }
    // ローカルストレージ更新
    storage.setItem('theme', value ? 'dark' : 'light')
}
function openDrawer() {
    isDrawerOpen.value = true
}
function closeDrawer() {
    isDrawerOpen.value = false
}

// Lifecycle hooks
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
        headerReloadKey.value++
    }
)

</script>

<template>
    <div id="app-container">
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
            header="個人設定"
        >
            <SettingsDrawerContent @close="closeDrawer" />
        </Drawer>
        <main
            ref="mainContainer"
            class="w-full flex flex-col justify-between overflow-y-auto dark:bg-[#070D19]"
            style="height: calc(100vh - 60px);"
        >
            <slot />
            <CommonFooter />
        </main>
        <!-- Loader -->
        <Loader />
        <!-- Flush Notifications -->
        <Toast
            position="top-right"
            group="notices"
        />
    </div>
</template>