<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'
import { useOptionStore } from '~/stores/useOptionStore'
import { useLoaderStore } from '~/stores/useLoaderStore'
import { useI18n } from 'vue-i18n'
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

// i18n
const { t, locale, setLocale } = useI18n()

// Refs & Computed
const internalLang  = ref<string>(locale.value)
const internalTheme = ref<string>(userStore.user?.theme ?? 'light')
const internalHomepage = ref<string>(userStore.user?.homePage ?? 'apps')
const languageOptions = computed(() => optionStore.languageOptions)
const themeOptions = computed(() => optionStore.themeOptions)
const homepageOptions = computed(() => optionStore.homepageOptions)
const lastLoginDate = computed(() => {
    return userStore.user?.lastLogin ? strFromDate(userStore.user.lastLogin, '%Y-%m-%d %H:%M') : '&mdash;'
})
const storage = new StorageUtil()
const currentPlan = ref<string>(capitalize(userStore.user?.plan ?? 'free'))
const isDemoUser = computed(() => userStore.hasUserRole('demo')) // デモユーザーかどうか
// デバッグ用
const showModal = ref<boolean>(false)
const showPPModal = ref<boolean>(false)

// Methods
async function handleEditProfile() {
    const lid = loaderStore.show(t('settingsDrawer.loading'))
    emit('close')
    await navigateTo({ path: '/settings' })
    loaderStore.hide(lid)
}
async function handleLogout() {
    const lid = loaderStore.show(t('settingsDrawer.loggingOut'))
    emit('close')
    await userStore.logout()
    await navigateTo({ path: '/auth/login', replace: true })
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
        setLocale(newLang as Language)
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
        if (userData?.language) {
            internalLang.value = userData.language
            setLocale(userData.language as Language)
        }
        internalTheme.value = userData?.theme ?? 'light'
        internalHomepage.value = userData?.homePage ?? '/apps'
    },
    { deep: true, immediate: true }
)

</script>

<template>
    <div class="h-full w-full px-4 py-6 flex flex-col justify-between items-start">
        <div class="flex items-center gap-4 mb-2">
            <Avatar v-bind="avatarProps('large')" />
            <h3 class="text-lg font-semibold">{{ userStore.user?.name ?? t('settingsDrawer.unset') }}</h3>
        </div>
        <div class="flex items-center gap-4 text-sm text-surface-600 dark:text-gray-400 mb-2">
            <span>{{ userStore.user?.email }}</span>
        </div>
        <div class="flex items-center gap-4 text-sm text-surface-600 dark:text-gray-400">
            <span>{{ t('settingsDrawer.lastLogin') }}:</span>
            <span>{{ lastLoginDate }}</span>
        </div>
        <Divider />
        <div class="flex items-center gap-2 mb-4">
            <label for="language-select" class="w-32 mb-0">{{ t('settingsDrawer.language') }}</label>
            <Select
                id="language-select"
                v-model="internalLang"
                :options="languageOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('settingsDrawer.languagePlaceholder')"
                class="w-40"
            />
        </div>
        <div class="flex items-center gap-2 mb-4">
            <label for="theme-select" class="w-32 mb-0">{{ t('settingsDrawer.theme') }}</label>
            <Select
                id="theme-select"
                v-model="internalTheme"
                :options="themeOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('settingsDrawer.themePlaceholder')"
                class="w-40"
            />
        </div>
        <div class="flex items-center gap-2">
            <label for="homepage-select" class="w-32 mb-0">{{ t('settingsDrawer.homepage') }}</label>
            <Select
                id="homepage-select"
                v-model="internalHomepage"
                :options="homepageOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('settingsDrawer.homepagePlaceholder')"
                class="w-40"
            />
        </div>
        <div class="flex-grow h-full w-full flex flex-col justify-between">
            <template v-if="isDemoUser">
                <Divider />
                <p class="text-antialiasing mb-2">{{ t('settingsDrawer.others') }}</p>
                <div class="flex items-center gap-2">
                    <label for="plan-select" class="w-32 mb-0">{{ t('settingsDrawer.plan') }}</label>
                    <Select
                        id="plan-select"
                        v-model="currentPlan"
                        :options="[ 'Free', 'Standard', 'Premium', 'Demo' ]"
                        :placeholder="t('settingsDrawer.planPlaceholder')"
                        :disabled="true"
                        class="w-40"
                    />
                    <Button :label="t('settingsDrawer.change')" class="btn btn-alt mb-0" :disabled="true" @click="" />
                </div>
                <div class="flex justify-between items-center gap-2 mt-auto">
                    <!-- /*
                    <CommonDocumentModal
                        v-model:visible="showModal"
                        src="/docs/template.md"
                        :title="t('settingsDrawer.mdTemplateTitle')"
                        width="80vw"
                        maxWidth="800px"
                    />
                    <CommonDocumentModal
                        v-model:visible="showPPModal"
                        :src="`/docs/privacy_policy_${internalLang}.md`"
                        :title="t('settingsDrawer.privacyPolicyTitle')"
                        width="80vw"
                        maxWidth="800px"
                    />
                    <div class="w-full flex justify-center items-center gap-4">
                        <Button :label="t('settingsDrawer.showDocument')" class="btn btn-alt" @click="showModal = true" />
                        <Button :label="t('settingsDrawer.privacyPolicy')" class="btn btn-alt" @click="showPPModal = true" />
                    </div>
                    */ -->
                </div>
            </template>
        </div>
        <div class="w-full">
            <Divider />
            <div class="flex items-center gap-4 mb-4">
                <Button
                    :label="t('settingsDrawer.editProfile')"
                    class="w-full btn btn-alt"
                    @click="handleEditProfile"
                    :disabled="isDemoUser"
                />
                <Button
                    :label="t('settingsDrawer.logout')"
                    class="w-full btn btn-secondary"
                    @click="handleLogout"
                />
            </div>
        </div>
    </div>
</template>