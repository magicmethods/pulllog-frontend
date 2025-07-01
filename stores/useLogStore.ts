import { useUserStore } from '~/stores/useUserStore'
import { useStatsStore } from '~/stores/useStatsStore'
import { useLoaderStore } from '~/stores/useLoaderStore'
import { useAPI } from '~/composables/useAPI'
import { endpoints } from '~/api/endpoints'

// ユーティリティ関数
function createQueryKey(options: FetchLogsOptions): string {
    // 必ずソート済みで一意化
    const stableOptions = Object.keys(options)
        .sort()
        .reduce((obj, key) => {
            // biome-ignore lint:/suspicious/noExplicitAny
            (obj as any)[key] = (options as any)[key]
            return obj
        }, {} as FetchLogsOptions)
    return JSON.stringify(stableOptions)
}
function isCacheKeyAffectedByDate(options: FetchLogsOptions, logDate: string): boolean {
    // logDate（例：today）がキャッシュのfrom/to/limit範囲に該当し得る場合
    if (options.fromDate && options.fromDate > logDate) return false
    if (options.toDate && options.toDate < logDate) return false
    // limitのみ指定・範囲不明系は問答無用で消す
    if (options.limit !== undefined && !options.fromDate && !options.toDate) return true
    // from/to/limit全部なし（全件取得）も消す
    if (!options.fromDate && !options.toDate && options.limit === undefined) return true
    return true
}

export const useLogStore = defineStore('log', () => {
    // composables
    const { callApi } = useAPI()

    // appId -> date -> DateLog
    const logs = ref<LogsMap>(new Map())
    // appId -> queryKey -> DateLog[]
    const logsList = ref<LogsListMap>(new Map())
    const isLoading = ref<boolean>(false)
    const error = ref<string | null>(null)

    // Actions
    function getLog(appId: string, date: string): DateLog | undefined {
        const appMap = logs.value.get(appId)
        return appMap ? appMap.get(date) : undefined
    }
    function setLog(appId: string, date: string, log: DateLog): void {
        let appMap = logs.value.get(appId)
        if (!appMap) {
            appMap = new Map<string, DateLog>()
            logs.value.set(appId, appMap)
        }
        appMap.set(date, log)
    }
    function getLogsList(appId: string, queryKey: string): DateLog[] | undefined {
        const appMap = logsList.value.get(appId)
        return appMap ? appMap.get(queryKey) : undefined
    }
    function setLogsList(appId: string, queryKey: string, list: DateLog[]): void {
        let appMap = logsList.value.get(appId)
        if (!appMap) {
            appMap = new Map<string, DateLog[]>()
            logsList.value.set(appId, appMap)
        }
        appMap.set(queryKey, list)
    }
    function deleteAffectedLogsListCache(appId: string, logDate: string): void {
        const appMap = logsList.value.get(appId)
        if (!appMap) return
        for (const [queryKey, list] of appMap.entries()) {
            const options = JSON.parse(queryKey) as FetchLogsOptions
            if (isCacheKeyAffectedByDate(options, logDate)) {
                appMap.delete(queryKey)
            }
        }
    }

    // Methods
    /**
     * API経由で単一日次ログを取得しキャッシュする
     * @param appId アプリケーションID
     * @param date 日付（YYYY-MM-DD形式）
     * @returns 日次ログデータ（DateLog）またはnull（エラー時）
     * @throws エラー時はerrorにメッセージがセットされる
     */
    async function fetchLog(appId: string, date: string): Promise<DateLog | null> {
        error.value = null
        const cached = getLog(appId, date)
        if (cached) {
            console.log('fetchLog: キャッシュから取得', cached)
            return cached // キャッシュがあれば即返す
        }

        isLoading.value = true
        const loaderStore = useLoaderStore()
        const loaderId = loaderStore.show('履歴データを読み込み中...')
        try {
            // CSRFトークンからユーザーIDは補完されるので、ユーザーIDを指定する必要はない
            const userStore = useUserStore()
            if (!userStore.user?.id) throw new Error('未ログイン')

            // API呼び出し
            const response = await callApi<DateLog>({
                endpoint: endpoints.logs.daily(appId, date),
                method: 'GET'
            })
            // 該当するログが見つからない場合は null が返る
            console.log('fetchLog: APIレスポンスから取得', response)
            if (!response) {
                error.value = '履歴データが見つかりません'
                return null
            }
            setLog(appId, date, response)
            return response
        } catch (e: unknown) {
            console.error('Failed to fetch log:', e)
            error.value = e instanceof Error ? e.message : '履歴データ取得エラー'
            return null
        } finally {
            isLoading.value = false
            loaderStore.hide(loaderId)
        }
    }
    /**
     * API経由で複数件のログを取得（範囲・件数・クエリキャッシュ付き）
     * @param appId アプリケーションID
     * @param options 取得オプション（fromDate, toDate, limit, offset）
     * @param loaderContainerElement ローダー表示用のコンテナ要素（オプション）
     * @return 日次ログデータの配列（DateLog[]）または空配列（エラー時）
     * @throws エラー時はerrorにメッセージがセットされる
     */
    async function fetchLogs(
        appId: string,
        options: FetchLogsOptions = {},
        loaderContainerElement?: HTMLElement
    ): Promise<DateLog[]> {
        error.value = null
        const queryKey = createQueryKey(options)
        const cached = getLogsList(appId, queryKey)
        if (cached) {
            console.log('fetchLogs: キャッシュから取得', cached)
            return cached
        }

        isLoading.value = true
        const loaderStore = useLoaderStore()
        const loaderId = loaderStore.show('履歴リストを取得中...', loaderContainerElement ?? null)
        try {
            const userStore = useUserStore()
            if (!userStore.user?.id) throw new Error('未ログイン')

            // APIコール
            const endpoint = endpoints.logs.list(appId, {
                from: options.fromDate,
                to: options.toDate,
                limit: options.limit,
                offset: options.offset
            })
            const response = await callApi<DateLog[]>({
                endpoint,
                method: 'GET'
            })
            console.log('fetchLogs: APIレスポンスから取得', response)
            if (Array.isArray(response)) {
                // 個別キャッシュにも反映（レスポンスが空配列の場合もAPI的に「本当にゼロ件」→キャッシュしてOK）
                for (const log of response) {
                    if (log?.date) setLog(appId, log.date, log)
                }
                setLogsList(appId, queryKey, response)
                return response
            }
            error.value = '履歴リストが取得できません'
            // キャッシュを作らず、明示的に該当Keyを削除（既にあれば）
            logsList.value.get(appId)?.delete(queryKey)
            return []
        } catch (e: unknown) {
            console.error('Failed to fetch logs:', e)
            error.value = e instanceof Error ? e.message : '履歴リスト取得エラー'
            // キャッシュせず、既存キャッシュも削除
            logsList.value.get(appId)?.delete(queryKey)
            return []
        } finally {
            isLoading.value = false
            loaderStore.hide(loaderId)
        }
    }
    /**
     * API経由で日次ログを保存しキャッシュを更新する
     * @param log 保存する日次ログデータ
     * @returns 保存後のDateLogデータまたはnull（エラー時）
     * @throws エラー時はerrorにメッセージがセットされる
     */
    async function saveLog(log: DateLog): Promise<DateLog | null> {
        isLoading.value = true
        error.value = null
        const loaderStore = useLoaderStore()
        const loaderId = loaderStore.show('履歴データを保存中...')
        try {
            // 既存編集はPUT、新規登録はPOST
            const isEdit = Boolean(getLog(log.appId, log.date))
            const endpoint = isEdit
                ? endpoints.logs.update(log.appId, log.date) // {API_BASE_URL}/logs/daily/:appId/:date
                : endpoints.logs.create(log.appId, log.date) // {API_BASE_URL}/logs/daily/:appId/:date
            const method = isEdit ? 'PUT' : 'POST'
            const saved = await callApi<DateLog | null>({
                endpoint,
                method,
                data: log,
            })
            // ローカル logs も即時同期（返却された内容で上書き）
            console.log('saveLog: APIレスポンス', saved)
            if (saved) {
                setLog(log.appId, log.date, saved)
                if (isEdit) {
                    // 既存データ更新→キャッシュリストを更新
                    const appMap = logsList.value.get(log.appId)
                    if (appMap) {
                        for (const list of appMap.values()) {
                            const idx = list.findIndex(item => item.date === saved.date)
                            if (idx !== -1) list[idx] = saved
                        }
                    }
                } else {
                    // 新規登録時はtodayが影響し得る全キャッシュを全て削除
                    deleteAffectedLogsListCache(log.appId, log.date)
                }
                // 統計キャッシュをクリアする
                const statsStore = useStatsStore()
                statsStore.clearStatsCache(log.appId)
                return saved
            }
            error.value = '履歴の保存に失敗しました'
            throw new Error(error.value)
        } catch (e: unknown) {
            console.error('Failed to save log:', e)
            error.value = e instanceof Error ? e.message : '履歴の保存に失敗しました'
            throw e
        } finally {
            isLoading.value = false
            loaderStore.hide(loaderId)
        }
    }
/**
     * API経由で履歴ファイルをインポートする
     * @param appId アプリケーションID
     * @param file インポートするファイル（Fileオブジェクト）
     * @returns 成功した場合はtrue、失敗した場合はfalse
     * @throws エラー時はerrorにメッセージがセットされる
     */
    async function importLogsFile(appId: string, file: File): Promise<boolean> {
        isLoading.value = true
        error.value = null
        // ローダー表示はオプションにするかもしれない
        //const loaderStore = useLoaderStore()
        //const loaderId = loaderStore.show('履歴をインポート中...')
        try {
            const response = await callApi<{ state: 'success' | 'error', message?: string } | null>({
                endpoint: endpoints.logs.import(appId),
                method: 'POST',
                data: { file }
            })
            console.log('importLogsFile: APIレスポンス', response)
            if (response?.state === 'success') {
                // インポート成功時は対象appIdのキャッシュをクリア
                logs.value.delete(appId) // 全てのキャッシュをクリア
                logsList.value.delete(appId) // リストキャッシュもクリア
                // 対象appIdの履歴（全期間）を再取得 -> コンポーネント側で後続処理
                //await fetchLogs(appId)
                return true
            }
            error.value = response?.message ?? '履歴のインポートに失敗しました'
            throw new Error(error.value)
        } catch (e: unknown) {
            console.error('Failed to import history:', e)
            error.value = e instanceof Error ? e.message : '履歴のインポートに失敗しました'
            return false
        } finally {
            isLoading.value = false
            //loaderStore.hide(loaderId)
        }
    }
    /** 全キャッシュクリア */
    function clearLogs() {
        logs.value.clear()
        logsList.value.clear()
    }
    /** リストキャッシュのみクリア */
    function clearLogsListCache() {
        logsList.value.clear()
    }

    return {
        logs,
        logsList,
        isLoading,
        error,
        fetchLog,
        fetchLogs,
        saveLog,
        importLogsFile,
        clearLogs,
        clearLogsListCache,
    }
})
