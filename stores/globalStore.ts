import { useAppStore } from '~/stores/useAppStore'
import { useLoaderStore } from '~/stores/useLoaderStore'

export const useGlobalStore = defineStore('global', () => {
    const isInitialized = ref<boolean>(false)
    const isLoading = ref<boolean>(false) // アプリ全体の代表ローディング状態
    const loadingId = ref<string | null>(null) // ローディングID（必要に応じて）

    function setInitialized(value: boolean) {
        isInitialized.value = value
        if (value) {
            // 初期化完了時にアプリケーションとユーザーストアを初期化
            const appStore = useAppStore()
            appStore.clearApp()
        }
    }

    // グローバルローディング用ラッパー
    function setLoading(show: boolean, loadingText?: string): void {
        isLoading.value = show
        if (show) {
            // ローディング開始時にローダーストアを表示
            const loaderStore = useLoaderStore()
            loadingId.value = loaderStore.show(loadingText || 'Loading...')
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
