//import { useUserStore } from '~/stores/useUserStore'
//import { useLoaderStore } from '~/stores/useLoaderStore'
import { useAPI } from '~/composables/useAPI'
import { endpoints } from '~/api/endpoints'

export const useAppStore = defineStore('app', () => {
    // composables
    const { callApi } = useAPI()

    // state
    const app = ref<AppData | null>(null)
    const appList = ref<AppData[]>([])
    const isLoading = ref<boolean>(false)
    const error = ref<string | null>(null)

    // actions
    function setApp(oneApp: AppData) {
        app.value = oneApp
    }

    function clearApp() {
        app.value = null
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

    return {
        app,
        appList,
        isSelectedApp,
        isLoading,
        error,
        setApp,
        clearApp,
        loadApps,
    }
})
