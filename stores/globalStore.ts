import { useUserStore } from '~/stores/useUserStore'
import { useAppStore } from '~/stores/useAppStore'
import { useLoaderStore } from '~/stores/useLoaderStore'
import { useI18n } from 'vue-i18n'

export const useGlobalStore = defineStore('global', () => {
    // i18n
    const { t, locale, setLocale } = useI18n()

    // State
    const isInitialized = ref<boolean>(false)
    const isLoading = ref<boolean>(false) // アプリ全体の代表ローディング状態
    const loadingId = ref<string | null>(null) // ローディングID（必要に応じて）

    function setInitialized(value: boolean) {
        isInitialized.value = value
        if (value) {
            // アプリケーションを初期化
            const appStore = useAppStore()
            appStore.clearApp()
            // ユーザー言語設定を適用
            const userStore = useUserStore()
            const initialLocale = (userStore.user?.language || locale.value || 'ja') as Language
            setLocale(initialLocale)
        }
    }

    // グローバルローディング用ラッパー
    function setLoading(show: boolean, loadingText?: string): void {
        isLoading.value = show
        if (show) {
            // ローディング開始時にローダーストアを表示
            const loaderStore = useLoaderStore()
            loadingId.value = loaderStore.show(loadingText || t('app.loading'))
        } else if (loadingId.value) {
            // ローディング終了時にローダーストアを非表示
            const loaderStore = useLoaderStore()
            loaderStore.hide(loadingId.value)
            loadingId.value = null
        }
    }

    return {
        isInitialized,
        isLoading,
        setInitialized,
        setLoading
    }
})
