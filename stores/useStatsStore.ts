import { endpoints } from "~/api/endpoints"
import { useAPI } from "~/composables/useAPI"
import { useLoaderStore } from "~/stores/useLoaderStore"
import { useUserStore } from "~/stores/useUserStore"

// ユーティリティ関数
function generateStatsQueryKey(params: { start: string; end: string }): string {
    return JSON.stringify(params)
}

export const useStatsStore = defineStore("stats", () => {
    // composables
    const { callApi } = useAPI()

    // i18n
    const t = (key: string | number) => useNuxtApp().$i18n.t(key)

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
        // Vue のリアクティブ更新（念のため）
        statsMap.value = new Map(statsMap.value)
    }

    // Methods
    /**
     * API 経由でアプリ単位の集計データを取得しキャッシュする
     */
    async function fetchStats(
        appId: string,
        start: string,
        end: string,
        loaderElement?: HTMLElement | null,
        showLoader = true,
    ): Promise<StatsData | null> {
        error.value = null
        const queryKey = generateStatsQueryKey({ start, end })
        const cached = getStats(appId, queryKey)
        if (cached) {
            return cached // キャッシュがあれば即返す
        }

        isLoading.value = true
        const loaderStore = useLoaderStore()
        let loaderId: string | undefined
        if (showLoader) {
            const targetElement = loaderElement ? loaderElement : null
            loaderId = loaderStore.show(t("stats.loading.stats"), targetElement)
        }
        try {
            const userStore = useUserStore()
            if (!userStore.user?.id) throw new Error(t("app.error.noLogin"))

            // API コール
            const response = await callApi<StatsData>({
                endpoint: endpoints.stats.list(appId, start, end), // `/api/stats/{appId}?start=yyyy-mm-dd&end=yyyy-mm-dd`
                method: "GET",
            })
            if (!response) {
                error.value = t("app.error.statsNotFound")
                return null
            }
            setStats(appId, queryKey, response)
            return response
        } catch (e: unknown) {
            console.error("fetchStats error:", e)
            error.value =
                e instanceof Error ? e.message : t("app.error.statsNotFound")
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
            statsMap.value = new Map(statsMap.value)
        }
    }
    function clearStatsCacheAll(): void {
        statsMap.value.clear()
        statsMap.value = new Map()
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
