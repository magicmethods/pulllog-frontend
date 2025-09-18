import { endpoints } from "~/api/endpoints"
import { useAPI } from "~/composables/useAPI"
import { useLoaderStore } from "~/stores/useLoaderStore"
import { useStatsStore } from "~/stores/useStatsStore"
import { useUserStore } from "~/stores/useUserStore"
import { prepareCsvForUpload } from "~/utils/file"

// Types
// type LastFetchedAtMap = Map<string, string | null> // appId -> ISO8601
type LastFetchedAtMap = Map<string, Map<string, string | null>> // appId -> queryKey -> ISO8601

// ユーティリティ関数
function createQueryKey(options: FetchLogsOptions): string {
    // 必ずソート済みで一意化
    const stableOptions = Object.keys(options)
        .sort()
        .reduce((obj, key) => {
            // biome-ignore lint:/suspicious/noExplicitAny
            ;(obj as any)[key] = (options as any)[key]
            return obj
        }, {} as FetchLogsOptions)
    return JSON.stringify(stableOptions)
}
function isCacheKeyAffectedByDate(
    options: FetchLogsOptions,
    logDate: string,
): boolean {
    /*
    // logDate（例：today）がキャッシュのfrom/to/limit範囲に該当し得る場合
    if (options.fromDate && options.fromDate > logDate) return false
    if (options.toDate && options.toDate < logDate) return false
    // limitのみ指定・範囲不明系は問答無用で消す
    if (options.limit !== undefined && !options.fromDate && !options.toDate) return true
    // from/to/limit全部なし（全件取得）も消す
    if (!options.fromDate && !options.toDate && options.limit === undefined) return true
    return true
    */
    const { fromDate, toDate, limit } = options

    // 両端含む判定
    if (fromDate || toDate) {
        if (fromDate && logDate < fromDate) return false
        if (toDate && logDate > toDate) return false
        return true // 範囲内なら影響あり
    }
    // limitのみ or 完全指定なし（全件）は「影響あり」
    if (limit !== undefined || (!fromDate && !toDate && limit === undefined)) {
        return true
    }
    return true // 完全指定なし（全件取得）も影響あり
}

export const useLogStore = defineStore("log", () => {
    // composables
    const { callApi } = useAPI()

    // i18n
    const t = (key: string | number) => useNuxtApp().$i18n.t(key)

    // appId -> date -> DateLog
    const logs = ref<LogsMap>(new Map())
    // appId -> queryKey -> DateLog[]
    const logsList = ref<LogsListMap>(new Map())
    // 最終取得日時キャッシュ: appId -> ISO8601形式の文字列
    const lastFetchedAt = ref<LastFetchedAtMap>(new Map())
    const isLoading = ref<boolean>(false)
    const error = ref<string | null>(null)
    const CACHE_EXPIRATION_TIME = 60 * 60 * 1000 // キャッシュの有効期限（1時間）

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
    function getLogsList(
        appId: string,
        queryKey: string,
    ): DateLog[] | undefined {
        const appMap = logsList.value.get(appId)
        return appMap ? appMap.get(queryKey) : undefined
    }
    function setLogsList(
        appId: string,
        queryKey: string,
        list: DateLog[],
    ): void {
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
        for (const [queryKey] of appMap.entries()) {
            const options = JSON.parse(queryKey) as FetchLogsOptions
            if (isCacheKeyAffectedByDate(options, logDate)) {
                appMap.delete(queryKey)
            }
        }
    }
    /*
    function setLastFetchedAt(appId: string, dateStr: string) {
        lastFetchedAt.value.set(appId, dateStr)
    }
    */
    function setLastFetchedAt(
        appId: string,
        queryKey: string,
        dateStr: string,
    ) {
        let m = lastFetchedAt.value.get(appId)
        if (!m) {
            m = new Map()
            lastFetchedAt.value.set(appId, m)
        }
        m.set(queryKey, dateStr)
    }
    /*
    function getLastFetchedAt(appId: string): string | null {
        return lastFetchedAt.value.get(appId) ?? null
    }
    */
    function getLastFetchedAt(appId: string, queryKey: string): string | null {
        return lastFetchedAt.value.get(appId)?.get(queryKey) ?? null
    }
    function resetLastFetchedAt(appId: string) {
        //lastFetchedAt.value.set(appId, null)
        lastFetchedAt.value.set(appId, new Map())
    }

    // Methods
    /**
     * API経由で単一日次ログを取得しキャッシュする
     * @param appId アプリケーションID
     * @param date 日付（YYYY-MM-DD形式）
     * @returns 日次ログデータ（DateLog）またはnull（エラー時）
     * @throws エラー時はerrorにメッセージがセットされる
     */
    async function fetchLog(
        appId: string,
        date: string,
    ): Promise<DateLog | null> {
        error.value = null

        const cached = getLog(appId, date)
        if (cached) {
            // console.log('fetchLog: fetch from cache', cached)
            return cached // キャッシュがあれば即返す
        }

        isLoading.value = true
        const loaderStore = useLoaderStore()
        const loaderId = loaderStore.show(t("history.loading.logs"))
        try {
            // CSRFトークンからユーザーIDは補完されるので、ユーザーIDを指定する必要はない
            const userStore = useUserStore()
            if (!userStore.user?.id) {
                error.value = t("app.error.noLogin")
                return cached ?? null
            }
            // API呼び出し
            const response = await callApi<DateLog>({
                endpoint: endpoints.logs.daily(appId, date),
                method: "GET",
                onAuthError: "throw", // 認証切れでもリダイレクトしない
            })
            // 該当するログが見つからない場合は null が返る
            //console.log('fetchLog: fetch from API response', response)
            if (!response) {
                error.value = t("app.error.logsNotFound")
                return cached ?? null
            }
            setLog(appId, date, response)
            return response
        } catch (e: unknown) {
            console.error("Failed to fetch log:", e)
            error.value =
                e instanceof Error ? e.message : t("app.error.logsNotFound")
            return cached ?? null
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
     * @param forceFetch 強制的にAPIから取得するか（キャッシュ無視）
     * @return 日次ログデータの配列（DateLog[]）または空配列（エラー時）
     * @throws エラー時はerrorにメッセージがセットされる
     */
    async function fetchLogs(
        appId: string,
        options: FetchLogsOptions = {},
        loaderContainerElement?: HTMLElement,
        forceFetch = false,
    ): Promise<DateLog[]> {
        const queryKey = createQueryKey(options)
        const now = Date.now()

        const lastFetched = getLastFetchedAt(appId, queryKey)
        const fetchedAt = lastFetched ? new Date(lastFetched).getTime() : 0
        const isExpired = now - fetchedAt >= CACHE_EXPIRATION_TIME

        // 今持っている（かもしれない）staleキャッシュ
        const stale = getLogsList(appId, queryKey)

        // 1) キャッシュ有効 or 強制でない限り、まずはキャッシュ返す
        //    - 有効期限内: キャッシュがあれば即返す
        if (!forceFetch && !isExpired && stale) {
            // console.log('fetchLogs: return cached (fresh)', stale)
            return stale
        }

        // 2) 期限切れだけど stale がある場合 → 先に stale を返しつつ更新を試みる
        //    同期関数内で二重返却はできないので、ここでは「更新試行 → 失敗なら stale を返す、成功なら新鮮データを返す」
        error.value = null
        isLoading.value = true
        const loaderStore = useLoaderStore()
        const loaderId = loaderStore.show(
            t("history.loading.logs"),
            loaderContainerElement ?? null,
        )

        try {
            const userStore = useUserStore()
            if (!userStore.user?.id) {
                // セッション情報がなければ stale を返す（UIを空にしない）
                const loginErr = t("app.error.noLogin")
                error.value = loginErr
                // console.warn('fetchLogs: no login, return stale if exists')
                return stale ?? []
            }

            // APIコール
            const endpoint = endpoints.logs.list(appId, {
                from: options.fromDate,
                to: options.toDate,
                limit: options.limit,
                offset: options.offset,
            })

            const response = await callApi<DateLog[]>({
                endpoint,
                method: "GET",
                onAuthError: "throw", // 認証切れでもリダイレクトしない
            })
            // console.log('fetchLogs: fetch from API response', response)
            if (response && Array.isArray(response)) {
                // 個別キャッシュにも反映（レスポンスが空配列の場合もAPI的に「本当にゼロ件」→キャッシュしてOK）
                for (const log of response) {
                    if (log?.date) setLog(appId, log.date, log)
                }
                setLogsList(appId, queryKey, response)
                setLastFetchedAt(appId, queryKey, new Date().toISOString())
                // console.log('fetchLogs: updated from API', response)
                return response
            }

            // API が配列を返さなかった（実質エラー扱い）→ stale があればそれを維持
            error.value = t("app.error.logsNotFound")
            // キャッシュを作らず、明示的に該当Keyを削除（既にあれば）
            // logsList.value.get(appId)?.delete(queryKey)
            return stale ?? []
        } catch (e: unknown) {
            // 3) 失敗時はキャッシュを消さない
            //    認証失効などの可能性があるので、stale を見せ続ける
            // 401/419 判定（形状は useAPI に依存）
            const status =
                e &&
                typeof e === "object" &&
                "status" in (e as Record<string, unknown>)
                    ? (e as { status?: number }).status
                    : undefined

            if (status === 401 || status === 419) {
                error.value = t("app.error.noLogin")
            } else {
                error.value =
                    e instanceof Error ? e.message : t("app.error.logsNotFound")
            }

            // logsList.value.get(appId)?.delete(queryKey)
            // ここで stale を返す（空に固定しない）
            return stale ?? []
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
        const loaderId = loaderStore.show(t("history.loading.saving"))
        try {
            // 既存編集はPUT、新規登録はPOST
            const isEdit = Boolean(getLog(log.appId, log.date))
            const endpoint = isEdit
                ? endpoints.logs.update(log.appId, log.date) // {API_BASE_URL}/logs/daily/:appId/:date
                : endpoints.logs.create(log.appId, log.date) // {API_BASE_URL}/logs/daily/:appId/:date
            const method = isEdit ? "PUT" : "POST"
            const saved = await callApi<DateLog | null>({
                endpoint,
                method,
                data: log,
            })
            // ローカル logs も即時同期（返却された内容で上書き）
            if (saved) {
                setLog(log.appId, log.date, saved)
                if (isEdit) {
                    // 既存データ更新→キャッシュリストを更新
                    const appMap = logsList.value.get(log.appId)
                    if (appMap) {
                        for (const list of appMap.values()) {
                            const idx = list.findIndex(
                                (item) => item.date === saved.date,
                            )
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
            error.value = t("app.error.saveFailed")
            throw new Error(error.value)
        } catch (e: unknown) {
            console.error("Failed to save log:", e)
            error.value =
                e instanceof Error ? e.message : t("app.error.saveFailed")
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
    async function importLogsFile(
        appId: string,
        uploadData: UploadData,
    ): Promise<boolean> {
        isLoading.value = true
        error.value = null
        // ローダー表示はオプションにするかもしれない
        //const loaderStore = useLoaderStore()
        //const loaderId = loaderStore.show('履歴をインポート中...')
        try {
            const formData = new FormData()
            // CSVの場合はアップロード前にfreeTextの正規化とヘッダ検証を行う
            let fileToUpload = uploadData.file
            if (uploadData.format === "csv") {
                try {
                    fileToUpload = await prepareCsvForUpload(uploadData.file)
                } catch (e) {
                    console.error("CSV sanitize failed:", e)
                    error.value = t("app.error.importFailed")
                    return false
                }
            }
            formData.append("file", fileToUpload)

            const response = await callApi<{
                state: "success" | "error"
                message?: string
            } | null>({
                endpoint: endpoints.logs.import(appId, uploadData.mode),
                method: "POST",
                data: formData,
            })
            //console.log('importLogsFile: returned API response', response)
            if (response?.state === "success") {
                // インポート成功時は対象appIdのキャッシュをクリア
                logs.value.delete(appId) // 全てのキャッシュをクリア
                logsList.value.delete(appId) // リストキャッシュもクリア
                lastFetchedAt.value.delete(appId) // 最終取得日時キャッシュもクリア
                // 対象appIdの履歴（全期間）を再取得 -> コンポーネント側で後続処理
                //await fetchLogs(appId)
                return true
            }
            error.value = response?.message ?? t("app.error.importFailed")
            throw new Error(error.value)
        } catch (e: unknown) {
            console.error("Failed to import history:", e)
            error.value =
                e instanceof Error ? e.message : t("app.error.importFailed")
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
        lastFetchedAt.value.clear()
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
        lastFetchedAt,
        setLastFetchedAt,
        getLastFetchedAt,
        resetLastFetchedAt,
        fetchLog,
        fetchLogs,
        saveLog,
        importLogsFile,
        clearLogs,
        clearLogsListCache,
    }
})
