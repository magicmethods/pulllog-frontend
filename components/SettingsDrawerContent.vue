<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'
import { useOptionStore } from '~/stores/useOptionStore'
import { useLoaderStore } from '~/stores/useLoaderStore'
import { strFromDate } from '~/utils/date'
import { StorageUtil } from '~/utils/storage'
import { capitalize } from '~/utils/string'

// Emits
const emit = defineEmits<
    (e: 'close') => void
>()

// Config
const appConfig = useConfig()

// Stores
const userStore = useUserStore()
const optionStore = useOptionStore()
const loaderStore = useLoaderStore()

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
// デバッグ用
const currentPlan = ref<string>(capitalize(userStore.user?.plan ?? 'free'))
const showModal = ref<boolean>(false)
const showPPModal = ref<boolean>(false)

// Methods
async function handleEditProfile() {
    const lid = loaderStore.show('読み込み中...')
    emit('close')
    await navigateTo({ path: '/settings' })
    loaderStore.hide(lid)
}
async function handleLogout() {
    const lid = loaderStore.show('ログアウト中...')
    emit('close')
    userStore.logout()
    await navigateTo({ path: '/auth/login' })
    loaderStore.hide(lid)
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
        </div>
        <div class="flex items-center gap-4 text-sm text-surface-600 dark:text-gray-400">
            <span>最終ログイン:</span>
            <span>{{ lastLoginDate }}</span>
        </div>
        <Divider />
        <div class="flex items-center gap-2 mb-4">
            <label for="language-select" class="w-32 mb-0">言語設定</label>
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
            <label for="theme-select" class="w-32 mb-0">テーマ設定</label>
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
            <label for="homepage-select" class="w-32 mb-0">ホームページ</label>
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
        <div class="flex-grow h-full w-full flex flex-col justify-between">
            <template v-if="appConfig.isDebug">
                <Divider />
                <p class="text-antialiasing mb-2">その他の設定項目</p>
                <div class="flex items-center gap-2">
                    <label for="plan-select" class="w-32 mb-0">プラン</label>
                    <Select
                        id="plan-select"
                        v-model="currentPlan"
                        :options="[ 'Free', 'Standard', 'Premium' ]"
                        placeholder="Choose Plan"
                        :disabled="true"
                        class="w-40"
                    />
                    <Button label="変更" class="btn btn-alt mb-0" :disabled="true" @click="" />
                </div>
                <div class="flex justify-between items-center gap-2 mt-auto">
                    <CommonDocumentModal
                        v-model:visible="showModal"
                        src="/docs/template.md"
                        title="Markdown スタイルテンプレート"
                        width="80vw"
                        maxWidth="800px"
                    />
                    <CommonDocumentModal
                        v-model:visible="showPPModal"
                        :src="`/docs/privacy_policy_${internalLang}.md`"
                        :title="internalLang === 'en' ? 'PullLog Privacy Policy' : 'PullLog プライバシーポリシー'"
                        width="80vw"
                        maxWidth="800px"
                    />
                    <div class="w-full flex justify-center items-center gap-4">
                        <Button label="文書を表示" class="btn btn-alt" @click="showModal = true" />
                        <Button label="プライバシーポリシー" class="btn btn-alt" @click="showPPModal = true" />
                    </div>
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