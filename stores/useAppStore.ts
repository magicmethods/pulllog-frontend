import { useUserStore } from '~/stores/useUserStore'
import { useLoaderStore } from '~/stores/useLoaderStore'
import { useCurrencyStore } from '~/stores/useCurrencyStore'
//import { useI18n } from 'vue-i18n'
import { useAPI } from '~/composables/useAPI'
import { endpoints } from '~/api/endpoints'

export const useAppStore = defineStore('app', () => {
    // composables
    const { callApi } = useAPI()

    // i18n
    //const { t } = useI18n()
    const t = (key: string | number) => useNuxtApp().$i18n.t(key)

    // state
    const app = ref<AppData | null>(null) // 現在選択中のアプリケーション
    const appList = ref<AppData[]>([])
    const isLoading = ref<boolean>(false)
    const error = ref<string | null>(null)

    // actions
    function setApp(oneApp: AppData | null) {
        app.value = oneApp
    }
    function setAppById(appId: string) {
        const foundApp = appList.value.find(a => a.appId === appId)
        if (foundApp) {
            app.value = foundApp
        } else {
            app.value = null
        }
    }
    function clearApp() {
        app.value = null
    }
    function clearAppList() {
        appList.value = []
    }
    function getAppCurrencyCode(): string {
        // アプリケーションの通貨単位を取得
        const cd = useCurrencyStore().get(app.value?.currency_code ?? '')
        return cd?.code || 'JPY' // デフォルトはJPY
    }

    // アプリケーション選択状態判定（getterとして使える）
    const isSelectedApp = computed(() => !!app.value)

    // Methods
    async function loadApps(): Promise<void> {
        isLoading.value = true
        const loaderStore = useLoaderStore()
        const loaderId = loaderStore.show(t('apps.loading.apps'))
        try {
            // CSRFトークンからユーザーIDは補完されるので、ユーザーIDを指定する必要はない
            const userStore = useUserStore()
            const userId = userStore.user?.id
            if (!userId) throw new Error(t('app.error.unknownUser'))

            // API呼び出し
            const response = await callApi<AppData[]>({
                endpoint: endpoints.apps.list(),
                method: 'GET',
            })
            console.log('loadApps response:', response)
            // レスポンスをstateに保存
            appList.value = response ?? []
        } finally {
            isLoading.value = false
            loaderStore.hide(loaderId)
        }
    }
    /**
     * アプリ新規追加・編集（appIdで判別）
     * @param appData 保存するアプリデータ
     * @returns 保存後のAppData（APIのレスポンス）
     */
    async function saveApp(appData: AppData): Promise<AppData> {
        isLoading.value = true
        error.value = null
        const loaderStore = useLoaderStore()
        const loaderId = loaderStore.show(t('apps.loading.saving'))
        try {
            // 既存（編集）はPUT、新規はPOST
            const isEdit = !!appData.appId
            const endpoint = isEdit
                ? endpoints.apps.update(appData.appId) // {API_BASE_URL}/apps/:id
                : endpoints.apps.create()             // {API_BASE_URL}/apps
            const method = isEdit ? 'PUT' : 'POST'

            const saved = await callApi<AppData>({
                endpoint,
                method,
                data: appData,
            })
            // ローカルappListも即時同期（返却された内容で上書き）
            console.log('saveApp response:', saved, appData)
            if (saved) {
                const idx = appList.value.findIndex(a => a.appId === saved.appId)
                if (idx >= 0) {
                    appList.value[idx] = saved
                } else {
                    appList.value.push(saved)
                }
                appList.value = [...appList.value] // 配列の再代入でリアクティブに強制更新
                return saved
            }
            error.value = t('app.error.saveFailed')
            throw new Error(error.value)
        } catch (e: unknown) {
            console.error('Failed to save app:', e)
            error.value = (e as Error)?.message || t('app.error.saveFailed')
            throw e
        } finally {
            isLoading.value = false
            loaderStore.hide(loaderId)
        }
    }
    /**
     * アプリケーションを削除
     * @param appId 削除するアプリケーションのID
     */
    async function deleteApp(appId: string): Promise<void> {
        isLoading.value = true
        error.value = null
        const loaderStore = useLoaderStore()
        const loaderId = loaderStore.show(t('apps.loading.deleting'))
        try {
            const deleted = await callApi<DeleteResponse>({
                endpoint: endpoints.apps.delete(appId),
                method: 'DELETE',
            })
            if (!deleted || deleted.state !== 'success') {
                error.value = deleted?.message || t('app.error.deleteFailed')
                throw new Error(error.value)
            }
            // ローカルappListからも削除
            appList.value = appList.value.filter(a => a.appId !== appId)
            // 選択中のアプリもクリア
            if (app.value?.appId === appId) {
                clearApp()
            }
        } catch (e: unknown) {
            console.error('Failed to delete app:', e)
            error.value = e instanceof Error ? e.message : t('app.error.deleteFailed')
            throw e
        } finally {
            isLoading.value = false
            loaderStore.hide(loaderId)
        }
    }

    return {
        app,
        appList,
        isSelectedApp,
        isLoading,
        error,
        setApp,
        setAppById,
        clearApp,
        clearAppList,
        getAppCurrencyCode,
        loadApps,
        saveApp,
        deleteApp,
    }
})
