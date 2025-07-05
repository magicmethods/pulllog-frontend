import { useUserStore } from '~/stores/useUserStore'
import { useLoaderStore } from '~/stores/useLoaderStore'
import { useAPI } from '~/composables/useAPI'
import { endpoints } from '~/api/endpoints'

/*
// Types
export interface StatsData {
    appId: string
    startDate: string
    endDate: string
    totalPulls: number
    rareDropCount: number
    rareDropRate: number
    totalExpense: number
    averageExpense: number
    averageRareDropRate: number
    // 追加項目: [今後拡張可能]
}
// 統計キャッシュのMap型
type StatsMap = Map<string, Map<string, StatsData>> // appId -> queryKey -> StatsData
*/

// ユーティリティ関数
function generateStatsQueryKey(params: { start: string; end: string }): string {
    return JSON.stringify(params)
}


export const useStatsStore = defineStore('stats', () => {
    // composables
    const { callApi } = useAPI()

    // appId -> queryKey -> StatsData
    const statsMap = ref<StatsMap>(new Map())
    const isLoading = ref<boolean>(false)
    const error = ref<string | null>(null)

    // Actions
    function getStats(appId: string, queryKey: string): StatsData | undefined {
        const appMap = statsMap.value.get(appId)
        return appMap ? appMap.get(queryKey) : undefined
    }
    function setStats(appId: string, queryKey: string, stats: StatsData): void {
        let appMap = statsMap.value.get(appId)
        if (!appMap) {
            appMap = new Map<string, StatsData>()
            statsMap.value.set(appId, appMap)
        }
        appMap.set(queryKey, stats)
        // Vueのリアクティブ再代入（念のため）
        statsMap.value = new Map(statsMap.value)
    }

    // Methods
    /**
     * API経由でアプリ単位の集計データを取得しキャッシュする
     * @param appId アプリケーションID
     * @param start 集計開始日（YYYY-MM-DD形式）
     * @param end 集計終了日（YYYY-MM-DD形式）
     * @param loaderElement ローダー表示用の要素（オプション）
     * @param showLoader ローダー表示フラグ（デフォルトはtrue）
     * @returns 集計データ（StatsData）またはnull（エラー時）
     * @throws エラー時はerrorにメッセージがセットされる
     */
    async function fetchStats(
        appId: string,
        start: string,
        end: string,
        loaderElement?: HTMLElement | null,
        showLoader = true
    ): Promise<StatsData | null> {
        error.value = null
        const queryKey = generateStatsQueryKey({ start, end })
        const cached = getStats(appId, queryKey)
        if (cached) {
            console.log('fetchStats: キャッシュから取得', cached)
            return cached // キャッシュがあれば即返す
        }

        isLoading.value = true
        const loaderStore = useLoaderStore()
        let loaderId: string | undefined
        if (showLoader) {
            const targetElement = loaderElement ? loaderElement : null
            loaderId = loaderStore.show('統計データを読み込み中...', targetElement)
        }
        try {
            const userStore = useUserStore()
            if (!userStore.user?.id) throw new Error('未ログイン')

            // APIコール
            const response = await callApi<StatsData>({
                endpoint: endpoints.stats.list(appId, start, end), // `/api/stats/{appId}?start=yyyy-mm-dd&end=yyyy-mm-dd`
                method: 'GET'
            })
            //console.log('fetchStats: APIレスポンスから取得', response)
            if (!response) {
                error.value = '統計データが見つかりません'
                return null
            }
            setStats(appId, queryKey, response)
            return response
        } catch (e: unknown) {
            console.error('fetchStats error:', e)
            error.value = e instanceof Error ? e.message : '統計情報の取得に失敗しました'
            return null
        } finally {
            isLoading.value = false
            if (showLoader && loaderId) loaderStore.hide(loaderId)
        }
    }
    // 指定アプリの統計キャッシュをクリア
    function clearStatsCache(appId: string): void {
        if (statsMap.value.has(appId)) {
            statsMap.value.delete(appId)
            statsMap.value = new Map(statsMap.value) // Vueのリアクティブ再代入
        }
    }
    function clearStatsCacheAll(): void {
        statsMap.value.clear()
        statsMap.value = new Map() // Vueのリアクティブ再代入
    }

    return {
        statsMap,
        isLoading,
        error,
        getStats,
        setStats,
        fetchStats,
        clearStatsCache,
        clearStatsCacheAll,
    }
})
