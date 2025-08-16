import { useOptionStore } from '~/stores/useOptionStore'
import { DateTime } from 'luxon'
import { stripEmoji } from '~/utils/string'

export function useStats() {
    const SYSTEM_OTHER_KEY = computed(() => useOptionStore().otherPlaceholder)

    /**
     * 複数アプリ合計課金額に占める各アプリの割合（Pieチャート用）
     * - 指定期間内で、どのアプリにどれだけ課金しているか比率で可視化
     * @param logs - 日付ごとのログデータ（アプリIDをキーにしたオブジェクト）
     * @param apps - アプリデータの配列（アプリIDと名前を含む）
     * @returns 
     */
    function getExpenseRatioPie(
        logs: { [appId: string]: DateLog[] },
        apps: AppData[]
    ): PieChartData {
        // アプリごとに合計
        const sumByApp: Record<string, number> = {}
        for (const appId in logs) {
            for (const log of logs[appId]) {
                sumByApp[appId] = (sumByApp[appId] ?? 0) + log.expense
            }
        }
        const total = Object.values(sumByApp).reduce((a, b) => a + b, 0)
        return apps.map(app => ({
            appId: app.appId,
            appName: app.name,
            currency: app.currency_unit ?? '',
            value: total > 0 ? sumByApp[app.appId] ?? 0 : 0
        }))
    }

    /**
     * 全指定アプリの月次合計課金額（積み上げ棒グラフ用）
     * - 期間内の月ごとに、どのアプリにいくら課金しているか＋全体でいくら使っているか推移を可視化
     * @param logs - 日付ごとのログデータ（アプリIDをキーにしたオブジェクト）
     * @param apps - アプリデータの配列（アプリIDと名前を含む）
     * @returns 
     */
    function getMonthlyExpenseStack(
        logs: { [appId: string]: DateLog[] },
        apps: AppData[]
    ): StackedBarData {
        // 月ごと・アプリごとに集計
        const byMonth: Record<string, Record<string, number>> = {}
        for (const appId in logs) {
            for (const log of logs[appId]) {
                const month = log.date.slice(0, 7)
                byMonth[month] = byMonth[month] ?? {}
                byMonth[month][appId] = (byMonth[month][appId] ?? 0) + log.expense
            }
        }
        const months = Object.keys(byMonth).sort()
        return months.map(month => {
            const row: StackedBarData[0] = { month }
            for (const app of apps) {
                row[app.appId] = byMonth[month][app.appId] ?? 0
            }
            return row
        })
    }

    /**
     * X軸のラベルを生成するヘルパーメソッド（折れ線グラフ用）
     * - 日次・週次・月次のいずれかで、指定期間の開始日から終了日までのラベルを生成
     * @param startDate - 開始日（ISO形式）
     * @param endDate - 終了日（ISO形式）
     * @param unit - 'day' | 'week' | 'month'
     * @returns 
     */
    function getXAxisLabels(
        startDate: string,
        endDate: string,
        unit: 'day' | 'week' | 'month'
    ): string[] {
        const labels: string[] = []
        let cursor = DateTime.fromISO(startDate)
        const end = DateTime.fromISO(endDate)
        if (!cursor.isValid || !end.isValid) return labels
        while (cursor <= end) {
            if (unit === 'day') {
                labels.push(cursor.toISODate() ?? cursor.toFormat('yyyy-MM-dd'))
                cursor = cursor.plus({ days: 1 })
            } else if (unit === 'week') {
                labels.push(cursor.toISODate() ?? cursor.toFormat('yyyy-MM-dd'))
                cursor = cursor.plus({ weeks: 1 })
            } else if (unit === 'month') {
                labels.push(cursor.toISODate() ?? cursor.toFormat('yyyy-MM-dd'))
                cursor = cursor.plus({ months: 1 })
            }
        }
        return labels
    }

    /**
     * 日次/月次累計レアドロップ率推移（折れ線グラフ用）
     * - 指定期間内の運気（レア率）推移を見える化。累進計算なので「今までどれくらいレア率が変化したか」が一目でわかる。
     * - 日付順にソートして、累積引き当て数とレアドロップ数を計算
     * - レアドロップ率は累積レアドロップ数 / 累積引き当て数 * 100
     * - 複数アプリ対応・期間外の累進値踏襲対応
     * @param apps Array<{ appId: string, logs: DateLog[] }>
     * @param startDate 集計開始日（YYYY-MM-DD）。未指定なら最小日付
     * @param endDate 集計終了日（YYYY-MM-DD）。未指定なら「現在日」
     * @param unit 粒度。未指定で自動
     * @returns CumulativeRareRate 型
     */
    function getMultiCumulativeRareRate(
        apps: { appId: string, logs: DateLog[] }[],
        startDate?: string,
        endDate?: string,
        unit?: 'day' | 'week' | 'month'
    ): CumulativeRareRate {
        // 全ログからグローバルな集計範囲（日付）を決定
        let minDate: string | undefined = startDate
        let maxDate: string | undefined = endDate

        const allDates = apps.flatMap(app => app.logs.map(log => log.date))
        const validDates = allDates
            .map(d => DateTime.fromISO(d))
            .filter(dt => dt.isValid)
            .sort((a, b) => a.toMillis() - b.toMillis())
        
        // 開始日の指定がなければ最小日付
        if (!minDate && validDates.length > 0) {
            minDate = validDates[0].toFormat('yyyy-MM-dd')
        }
        // 終了日の指定がなければ「今日」
        if (!maxDate && validDates.length > 0) {
            const today = DateTime.now().toFormat('yyyy-MM-dd')
            maxDate = today// validDates[validDates.length - 1].toFormat('yyyy-MM-dd')
        }
        if (!minDate || !maxDate) return []

        // unit自動判定
        let resolvedUnit: 'day' | 'week' | 'month' = 'day'
        if (!unit) {
            const start = DateTime.fromISO(minDate)
            const end = DateTime.fromISO(maxDate)
            if (start.isValid && end.isValid) {
                const days = end.diff(start, 'days').days
                if (days > 180) {
                    resolvedUnit = 'month'
                } else if (days > 60) {
                    resolvedUnit = 'week'
                } else {
                    resolvedUnit = 'day'
                }
            }
        } else {
            resolvedUnit = unit
        }

        // X軸（全アプリ共通の日付ラベル）生成
        const labels = getXAxisLabels(minDate, maxDate, resolvedUnit)

        // 各アプリについて、累進値を「開始日以前の分も合算」して踏襲
        return apps.map(app => {
            // 日付で昇順
            const sorted = app.logs.slice().sort((a, b) => a.date.localeCompare(b.date))

            // 開始日未満の累積をまず計算
            let initPulls = 0
            let initRare = 0
            for (const log of sorted) {
                if (log.date < minDate) {
                    initPulls += log.total_pulls
                    initRare += log.discharge_items
                }
            }
            // 開始日以降の分をX軸ごとに
            let cumulativePulls = initPulls
            let cumulativeRare = initRare
            const dateMap = new Map(sorted.map(log => [log.date, log]))

            // 終端の上限（週/月の最終区間を切り詰めるために使う）
            const endBound = DateTime.fromISO(maxDate)

            const rate: LineChartData = labels.map(date => {
                let pulls = 0
                let rareDrops = 0

                if (resolvedUnit === 'day') {
                    const log = dateMap.get(date)
                    if (log) {
                        pulls = log.total_pulls
                        rareDrops = log.discharge_items
                    }
                } else if (resolvedUnit === 'week' || resolvedUnit === 'month') {
                    const dt = DateTime.fromISO(date)
                    // 週/月の終端候補
                    const naiveEnd = resolvedUnit === 'week'
                        ? dt.plus({ days: 6 })
                        : dt.endOf('month')
                    // 終了日を上限にカット
                    const intervalEnd = naiveEnd < endBound ? naiveEnd : endBound

                    const groupLogs = sorted.filter(log => {
                        const logDt = DateTime.fromISO(log.date)
                        return logDt.isValid && logDt >= dt && logDt <= intervalEnd
                    })
                    
                    pulls = groupLogs.reduce((sum, log) => sum + log.total_pulls, 0)
                    rareDrops = groupLogs.reduce((sum, log) => sum + log.discharge_items, 0)
                }

                cumulativePulls += pulls
                cumulativeRare += rareDrops

                return {
                    date,
                    pulls,
                    rareDrops,
                    cumulativePulls,
                    cumulativeRareDrops: cumulativeRare,
                    rate: cumulativePulls > 0 ? (cumulativeRare / cumulativePulls) * 100 : 0
                }
            })
            return {
                appId: app.appId,
                rate
            }
        })
    }

    /**
     * アプリごとの累積レア率の最大値を計算
     * - 折れ線グラフのY軸の最大値を決定するために使用
     * - 各アプリのレア率データから最大値を取得し、+αして切り上げ
     * @param appsRareData - アプリごとの累積レア率データ
     * @param correction - 切り上げのための補正値（デフォルトは 0）
     * @returns 
     */
    function calcMaxRareRate(appsRareData: CumulativeRareRate, correction = 0): number {
        let max = 0
        for (const app of appsRareData) {
            for (const point of app.rate) {
                if (point.rate > max) max = point.rate
            }
        }
        return Math.ceil(max + correction) // 補正値を加算して切り上げ
    }

    /**
     * アプリごとの引き当て数・レアドロップ数・レア率を集計（横型棒グラフ）
     * - 各アプリの「引いた回数・レア率・レア数」の比較＋高レア率順でランキング
     * - 各アプリの引き当て数とレアドロップ数を集計し、レア率を計算
     * - レア率 = レアドロップ数 / 引き当て数 * 100
     * - 高レア率順のランキング形式にするかどうかはオプションで制御可能
     * @param logs - 日付ごとのログデータ（アプリIDをキーにしたオブジェクト）
     * @param apps - アプリデータの配列（アプリIDと名前を含む）
     * @param ranking - trueならレア率順にソート
     * @returns 
     */
    function getAppPullStats(
        logs: { [appId: string]: DateLog[] },
        apps: AppData[],
        ranking = false
    ): AppPullStats[] {
        // アプリごとに集計
        const byApp: Record<string, { pulls: number, rare: number }> = {}
        for (const appId in logs) {
            for (const log of logs[appId]) {
                byApp[log.appId] = byApp[log.appId] ?? { pulls: 0, rare: 0 }
                byApp[log.appId].pulls += log.total_pulls
                byApp[log.appId].rare += log.discharge_items
            }
        }
        const result = apps.map(app => {
            const stats = byApp[app.appId] ?? { pulls: 0, rare: 0 }
            return {
                appId: app.appId,
                appName: app.name,
                pulls: stats.pulls,
                rareDrops: stats.rare,
                rareRate: stats.pulls > 0 ? (stats.rare / stats.pulls) * 100 : 0
            }
        })
        return ranking ? result.sort((a, b) => b.rareRate - a.rareRate) : result
    }

    /**
     * アプリごとのレアドロップの内訳
     * - 指定期間での「すり抜け」や「ピックアップ」獲得率を見える化
     * @param logs - 日付ごとのログデータ（アプリIDをキーにしたオブジェクト）
     * @param apps - アプリデータの配列（アプリIDと名前を含む）
     * @returns 
     */
    function getAppRareDropRates(
        logs: { [appId: string]: DateLog[] },
        apps: AppData[]
    ): RareDropBreakdown {
        const result: RareDropBreakdown = []
        for (const app of apps) {
            const appLogs = logs[app.appId] || []
            const rare = appLogs.reduce((acc, log) => acc + log.discharge_items, 0)
            const loseEvenOdds = appLogs.reduce((acc, log) => acc + getMarkeredItem('lose', log), 0)
            const getPickup = appLogs.reduce((acc, log) => acc + getMarkeredItem('pickup', log), 0)
            const getTarget = appLogs.reduce((acc, log) => acc + getMarkeredItem('target', log), 0)
            const guaranteedPull = appLogs.reduce((acc, log) => acc + getMarkeredItem('guaranteed', log), 0)
            result.push({
                appId: app.appId,
                appName: app.name,
                rates: {
                    rare,
                    loseEvenOdds,
                    getPickup,
                    getTarget,
                    guaranteedPull
                }
            })
        }
        return result
    }

    /**
     * ドロップ詳細から指定マーカーの数をカウントするヘルパー関数
     * - ドロップ詳細のmarkerフィールドに基づいて、すり抜け・ピックアップ・狙い・確定枠の数をカウント
     * - ユーザーが独自に定義したmarkerには非対応
     * @param marker - 'lose' | 'pickup' | 'target' | 'guaranteed'
     * @param log - 日付ログデータ
     * @returns 指定マーカーの数
     */
    function getMarkeredItem(
        marker: 'lose' | 'pickup' | 'target' | 'guaranteed',
        log: DateLog
    ): number {
        if (!log.drop_details || log.drop_details.length === 0) return 0
        // ドロップ詳細から指定マーカーの数をカウント
        let pattern: RegExp
        switch (marker) {
            case 'lose': // すり抜け
                pattern = /(すり(抜|ぬ)け|lose\s?(the\s?)?(50(\/|\-)50)|(歪(了|斜)))/ig
                break
            case 'pickup': // ピックアップ
                pattern = /(ピック(アップ|)|pick(ed|-|)\s?up|((捡|拾)起))/ig
                break
            case 'target': // 狙い
                pattern = /((狙|ねら)い|target|目(标|標))/ig
                break
            case 'guaranteed': // 確定枠
                pattern = /((確定|かくてい)(枠|)|guaranteed|(保(底|证)))/ig
                break
            default:
                return 0
        }
        return log.drop_details.reduce((count, detail: DropDetail) => {
            return count + (detail.marker?.match(pattern) ? 1 : 0)
        }, 0)
    }

    /**
     * アプリごとのレアドロップアイテム名を集計
     * - 各アプリのドロップ詳細からアイテム名とレアリティ+アイテム名のカウントを取得
     * - ドロップ詳細がない場合は空オブジェクトを返す
     * - レアドロップアイテム名はカウント数の降順でソートする
     * @param logs - 日付ごとのログデータ（アプリIDをキーにしたオブジェクト）
     * @param apps - アプリデータの配列（アプリIDと名前を含む）
     * @returns 
     */
    function getAppRareDrops(
        logs: { [appId: string]: DateLog[] },
        apps: AppData[]
    ): RareDropRanking {
        const result: RareDropRanking = []
        for (const app of apps) {
            const appLogs = logs[app.appId] || []
            const dropItems = appLogs.reduce((acc: DropItems, log) => {
                const items = getDropItems(log)
                // acc と items に同一キー名があればカウント値を加算し、それ以外はそのまま追加
                for (const [name, count] of Object.entries(items.name)) {
                    acc.name[name] = (acc.name[name] ?? 0) + count
                }
                for (const [rarityName, count] of Object.entries(items.rarityName)) {
                    acc.rarityName[rarityName] = (acc.rarityName[rarityName] ?? 0) + count
                }
                for (const [markerName, count] of Object.entries(items.markerName)) {
                    acc.markerName[markerName] = (acc.markerName[markerName] ?? 0) + count
                }
                return acc
            }, {
                name: {} as Record<string, number>,
                rarityName: {} as Record<string, number>,
                markerName: {} as Record<string, number>
            })
            // アイテム名とレアリティ+アイテム名をカウント数の降順でソート
            const sortedName = Object.entries<number>(dropItems.name).sort((a, b) => b[1] - a[1])
            const sortedRarityName = Object.entries<number>(dropItems.rarityName).sort((a, b) => b[1] - a[1])
            const sortedMarkerName = Object.entries<number>(dropItems.markerName).sort((a, b) => b[1] - a[1])
            result.push({
                appId: app.appId,
                appName: app.name,
                items: {
                    name: Object.fromEntries(sortedName),
                    rarityName: Object.fromEntries(sortedRarityName),
                    markerName: Object.fromEntries(sortedMarkerName),
                }
            })
        }
        return result
    }

    /**
     * ドロップ詳細からアイテム名をカウントするヘルパー関数
     * - ドロップ詳細のnameフィールドの値をマップ化し、同一値の数をカウント
     * - ドロップ詳細のrarity+nameの複合値をマップ化し、同一値の数をカウント
     * - ドロップ詳細のname+markerの複合値をマップ化し、同一値の数をカウント
     * @param log - 日付ログデータ
     * @returns
     */
    function getDropItems(log: DateLog): DropItems {
        const nameMap: Record<string, number> = {}
        const rarityNameMap: Record<string, number> = {}
        const markerNameMap: Record<string, number> = {}

        if (log.drop_details && log.drop_details.length > 0) {
            for (const detail of log.drop_details) {
                // ユーザー入力による「その他」「other」はそのまま
                const name = detail.name?.trim()
                const nameIsSystemOther = !name || name === ''
                const isSystemOther = nameIsSystemOther || (!detail.name && (detail.rarity || detail.marker))

                const key = isSystemOther ? SYSTEM_OTHER_KEY.value : name

                nameMap[key] = (nameMap[key] ?? 0) + 1

                if (detail.rarity) {
                    const rarityNameKey = `${detail.rarity}|${key}`
                    rarityNameMap[rarityNameKey] = (rarityNameMap[rarityNameKey] ?? 0) + 1
                }
                if (detail.marker) {
                    const markerNameKey = `${key}|${stripEmoji(detail.marker)}`
                    markerNameMap[markerNameKey] = (markerNameMap[markerNameKey] ?? 0) + 1
                }
            }
        }

        // discharge_items > drop_details.length 分の未記入レアをシステム「その他」として追加
        const dischargeItems = log.discharge_items ?? 0
        const dropCount = log.drop_details ? log.drop_details.length : 0
        const unrecordedCount = dischargeItems - dropCount
        if (unrecordedCount > 0) {
            nameMap[SYSTEM_OTHER_KEY.value] = (nameMap[SYSTEM_OTHER_KEY.value] ?? 0) + unrecordedCount
        }

        return {
            name: nameMap,
            rarityName: rarityNameMap,
            markerName: markerNameMap
        }
    }

    // ...他の集計メソッド

    return {
        getExpenseRatioPie,
        getMonthlyExpenseStack,
        getMultiCumulativeRareRate,
        calcMaxRareRate,
        getAppPullStats,
        getAppRareDropRates,
        getAppRareDrops,
    }
}