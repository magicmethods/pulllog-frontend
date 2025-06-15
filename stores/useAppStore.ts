import { useUserStore } from '~/stores/useUserStore'
import { useLoaderStore } from '~/stores/useLoaderStore'
import { useAPI } from '~/composables/useAPI'
import { endpoints } from '~/api/endpoints'
import { getCurrencyData } from '~/utils/currency'

export const useAppStore = defineStore('app', () => {
    // composables
    const { callApi } = useAPI()

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
    function getAppCurrencyCode(): string {
        // アプリケーションの通貨単位を取得
        const cd = getCurrencyData(app.value?.currency_unit ?? '')
        return cd?.code || 'JPY' // デフォルトはJPY
    }

    // アプリケーション選択状態判定（getterとして使える）
    const isSelectedApp = computed(() => !!app.value)

    // Methods
    async function loadApps(): Promise<void> {
        isLoading.value = true
        const loaderStore = useLoaderStore()
        const loaderId = loaderStore.show('アプリケーションを読み込み中...')
        try {
            // CSRFトークンからユーザーIDは補完されるので、ユーザーIDを指定する必要はない
            const userStore = useUserStore()
            const userId = userStore.user?.id
            if (!userId) throw new Error('未ログイン')

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
        const loaderId = loaderStore.show('アプリケーションを保存中...')
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
            //console.log('saveApp response:', saved)
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
            error.value = '保存に失敗しました'
            throw new Error(error.value)
        } catch (
            // biome-ignore lint:/suspicious/noExplicitAny
            e: any
        ) {
            error.value = e?.message || '保存に失敗しました'
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
        getAppCurrencyCode,
        loadApps,
        saveApp,
    }
})
