<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'
import { useOptionStore } from '~/stores/useOptionStore'
import { strFromDate } from '~/utils/date'
import { StorageUtil } from '~/utils/storage'

// Emits
const emit = defineEmits<
    (e: 'close') => void
>()

// Config
const appConfig = useAppConfig()

// Stores
const userStore = useUserStore()
const optionStore = useOptionStore()

// Refs & Computed
const internalLang  = ref<string>(userStore.user?.language ?? 'ja')
const internalTheme = ref<string>(userStore.user?.theme ?? 'light')
const internalHomepage = ref<string>(userStore.user?.homePage ?? 'apps')
const languageOptions = optionStore.languageOptions
const themeOptions = optionStore.themeOptions
const homepageOptions = optionStore.homepageOptions
const lastLoginDate = computed(() => {
    return userStore.user?.lastLogin ? strFromDate(userStore.user.lastLogin, '%Y-%m-%d %H:%M') : '&mdash;'
})
const storage = new StorageUtil()

// Methods
function handleEditProfile() {
    emit('close')
    navigateTo({ path: '/settings' })
}
function handleLogout() {
    emit('close')
    userStore.logout()
    navigateTo({ path: '/auth/login' })
}
const avatarProps = (size?: 'xlarge' | 'large' | 'normal') => {
    const avatarProps = {
        size: size ?? 'normal',
        shape: 'circle',
    }
    if (userStore.user?.avatarUrl) {
        return { ...avatarProps, image: userStore.user.avatarUrl }
    }
    if (userStore.user?.name) {
        return { ...avatarProps, label: userStore.user.name.substring(0, 1).toLocaleUpperCase() }
    }
    return { ...avatarProps, icon: 'pi pi-user' }
}

// Watchers
watch(
    () => internalLang.value,
    (newLang) => {
        if (userStore.user) {
            userStore.user.language = newLang
        }
        storage.setItem('language', newLang)
    }
)
watch(
    () => internalTheme.value,
    (newTheme) => {
        if (userStore.user) {
            userStore.user.theme = newTheme
        }
        storage.setItem('theme', newTheme)
        if (typeof window !== 'undefined') {
            const html = document.documentElement
            html.classList.add('theme-switching')
            if (newTheme === 'dark') {
                html.classList.add('app-dark')
            } else {
                html.classList.remove('app-dark')
            }
            void html.offsetWidth
            requestAnimationFrame(() => {
                html.classList.remove('theme-switching')
            })
        }
    }
)
watch(
    () => internalHomepage.value,
    (newHomepage) => {
        if (userStore.user) {
            userStore.user.homePage = newHomepage
        }
    }
)
watch(
    // ストアのユーザーデータを監視
    () => userStore.user,
    (userData) => {
        internalLang.value = userData?.language ?? 'ja'
        internalTheme.value = userData?.theme ?? 'light'
        internalHomepage.value = userData?.homePage ?? '/history'
    },
    { deep: true, immediate: true }
)

</script>

<template>
    <div class="h-full w-full px-4 py-6 flex flex-col justify-between items-start">
        <div class="flex items-center gap-4 mb-2">
            <Avatar v-bind="avatarProps('large')" />
            <h3 class="text-lg font-semibold">{{ userStore.user?.name ?? '未設定' }}</h3>
        </div>
        <div class="flex items-center gap-4 text-sm text-surface-600 dark:text-gray-400 mb-2">
            <span>{{ userStore.user?.email }}</span>
            <span v-if="appConfig.isDebug" class="text-sm text-surface-600 dark:text-gray-400">(ID: {{ userStore.user?.id }})</span>
        </div>
        <div class="flex items-center gap-4 text-sm text-surface-600 dark:text-gray-400">
            <span>最終ログイン:</span>
            <span>{{ lastLoginDate }}</span>
        </div>
        <Divider />
        <div class="flex items-center gap-2 mb-4">
            <label for="language-select" class="w-32">言語設定</label>
            <Select
                id="language-select"
                v-model="internalLang"
                :options="languageOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Choose Language"
                class="w-40"
            />
        </div>
        <div class="flex items-center gap-2 mb-4">
            <label for="theme-select" class="w-32">テーマ設定</label>
            <Select
                id="theme-select"
                v-model="internalTheme"
                :options="themeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Switch Theme"
                class="w-40"
            />
        </div>
        <div class="flex items-center gap-2">
            <label for="homepage-select" class="w-32">ホームページ</label>
            <Select
                id="homepage-select"
                v-model="internalHomepage"
                :options="homepageOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Choose Homepage"
                class="w-40"
            />
        </div>
        <div class="flex-grow w-full">
            <template v-if="appConfig.isDebug">
                <Divider />
                <p class="text-antialiasing mb-2">その他の設定項目があれば…</p>
                <div class="border rounded-lg mb-2 p-2 bg-surface-100 dark:bg-gray-950 border-surface-300 dark:border-gray-700">
                    <pre class="font-mono text-sm text-surface-600 dark:text-gray-400 whitespace-pre-wrap">{{ JSON.stringify(userStore.user, null, 2) }}</pre>
                </div>
            </template>
        </div>
        <div class="w-full">
            <Divider />
            <div class="flex items-center gap-4 mb-4">
                <Button label="登録情報変更" class="w-full btn btn-alt" @click="handleEditProfile" />
                <Button label="ログアウト" class="w-full btn btn-secondary" @click="handleLogout" />
            </div>
        </div>
    </div>
</template>