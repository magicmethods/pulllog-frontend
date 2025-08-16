<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '~/stores/useAppStore'
import { useUserStore } from '~/stores/useUserStore'
import { useCsrfStore } from '~/stores/useCsrfStore'
import { useLogStore } from '~/stores/useLogStore'
import { useStatsStore } from '~/stores/useStatsStore'

definePageMeta({
    layout: 'error'
})

const route = useRoute()
const { t } = useI18n()
const appStore = useAppStore()
const userStore = useUserStore()
const csrfStore = useCsrfStore()
const logStore = useLogStore()
const statsStore = useStatsStore()

// Refs & Local variables
const statusCode = Number(route.params.code || 500)
const copy = computed(() => {
    switch (statusCode) {
        case 400: return {
            title: t('app.error.badRequestTitle'),
            message: t('app.error.badRequestMessage'),
            primary: {
                label: t('app.backToHome'),
                action: () => navigateTo('/', { replace: true })
            }
        }
        case 401: return {
            title: t('app.error.unauthorizedTitle'),
            message: t('app.error.unauthorizedMessage'),
            primary: {
                label: t('app.goToLogin'),
                action: () => navigateTo(`/auth/login?redirect=${encodeURIComponent('/')}`, { replace: true })
            }
        }
        case 403: return {
            title: t('app.error.forbiddenTitle'),
            message: t('app.error.forbiddenMessage'),
            primary: {
                label: t('app.backToHome'),
                action: () => navigateTo('/', { replace: true })
            }
        }
        case 404: return {
            title: t('app.error.notFound'),
            message: t('app.error.pageNotFoundMessage'),
            primary: {
                label: t('app.backToHome'),
                action: () => navigateTo('/', { replace: true })
            }
        }
        case 419: return {
            title: t('app.error.sessionExpiredTitle'),
            message: t('app.error.sessionExpiredMessage'),
            primary: {
                label: t('app.goToLogin'),
                action: () => {
                    // ストアのCSRFトークンをクリア
                    //csrfStore.clearToken()
                    // RememberトークンのCookieがあれば削除
                    //document.cookie = 'remember_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; samesite=lax'
                    navigateTo(`/auth/login?redirect=${encodeURIComponent(route.query.from as string || '/')}`, { replace: true })
                }
            }
        }
        default: return {
            title: t('app.error.errorOccurred'),
            message: t('app.error.sorrySomethingWentWrong'),
            primary: {
                label: t('app.backToHome'),
                action: () => navigateTo('/', { replace: true })
            }
        }
    }
})

// Methods
function clearUserData() {
    userStore.clearUser()
    csrfStore.clearToken()
    appStore.clearApp()
    appStore.clearAppList()
    logStore.clearLogs()
    statsStore.clearStatsCacheAll()
}

// Lifecycle hooks
onMounted(() => {
    // エラー時はフロント側状態をクリア
    clearUserData()
    // ヘッダーを非表示にして全画面表示
    const headerElement = document.querySelector('header')
    if (headerElement) {
        headerElement.classList.add('hidden')
        const mainElement = document.querySelector('main')
        if (mainElement) {
            mainElement.setAttribute('style', 'height: 100vh; overflow: hidden')
        }
    }
})

</script>

<template>
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg px-8 py-10 max-w-md w-full text-center">
        <div class="mb-6">
            <h1 class="text-5xl font-bold text-rose-600 dark:text-rose-400 mb-2">
                {{ statusCode }}
            </h1>
            <p class="text-xl font-semibold text-gray-700 dark:text-gray-200">
                {{ copy.title }}
            </p>
        </div>
        <p class="text-gray-500 dark:text-gray-400 mb-8">
            {{ copy.message }}
        </p>
        <button
            class="mt-4 px-6 py-2 rounded-2xl bg-primary-600 text-white hover:bg-primary-700 transition"
            @click="copy.primary.action"
        >
            {{ copy.primary.label }}
        </button>
    </div>
</template>
