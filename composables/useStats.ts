import { useLogStore } from '~/stores/useLogStore'
import { DateTime } from 'luxon'

/*
// Types
type PieChartData = {
    appId: string
    appName: string
    currency: string // 通貨単位
    value: number
}[]
interface StackedBarRow {
    month: string // 'YYYY-MM'
    [appId: string]: number | string // 各アプリの月ごとの課金額
}
type StackedBarData = StackedBarRow[]
type LineChartData = {
    date: string // 'YYYY-MM-DD'
    pulls: number
    rareDrops: number
    cumulativePulls: number
    cumulativeRareDrops: number
    rate: number // %
}[]
type AppPullStats = {
    appId: string
    appName: string
    pulls: number
    rareDrops: number
    rareRate: number // %
}
*/

export function useStats() {
    const logStore = useLogStore()

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
     * @param startDate 集計開始日（YYYY-MM-DD）。未指定なら最小日付。
     * @param endDate 集計終了日（YYYY-MM-DD）。未指定なら最大日付。
     * @param unit 粒度。未指定で自動。
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
        if (!minDate && validDates.length > 0) minDate = validDates[0].toFormat('yyyy-MM-dd')
        if (!maxDate && validDates.length > 0) maxDate = validDates[validDates.length - 1].toFormat('yyyy-MM-dd')
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
                    let endDt: DateTime
                    if (resolvedUnit === 'week') {
                        endDt = dt.plus({ days: 6 })
                    } else {
                        endDt = dt.endOf('month')
                    }
                    const groupLogs = sorted.filter(
                        log => {
                            const logDt = DateTime.fromISO(log.date)
                            return logDt.isValid && logDt >= dt && logDt <= endDt
                        }
                    )
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
     * 単アプリのすり抜け率／ピックアップ引き当て率
     * - 指定期間での「すり抜け」や「ピックアップ」獲得率を見える化
     * @param logs 
     * @returns 
     */
    function getSingleAppRates(
        logs: DateLog[]
    ) {
        const rare = logs.reduce((acc, log) => acc + log.discharge_items, 0)
        const lost = logs.reduce((acc, log) => acc + getLostRere(log), 0)
        const pickup = logs.reduce((acc, log) => acc + getPickup(log), 0)
        return {
            lostRate: rare > 0 ? (lost / rare) * 100 : 0,
            pickupRate: rare > 0 ? (pickup / rare) * 100 : 0,
        }
    }

    function getLostRere(log: DateLog): number {
        // すり抜け数を取得
        return 0 // 仮
    }

    function getPickup(log: DateLog): number {
        // ピックアップ数を取得
        return 0 // 仮
    }


    function getRarityStats(appId: string, range?: [Date, Date]) {
        //
    }
    function getDailyStats(appId: string, range?: [Date, Date]) {
        //
    }
    // ...他の集計メソッド

    return {
        getExpenseRatioPie,
        getMonthlyExpenseStack,
        getMultiCumulativeRareRate,
        calcMaxRareRate,
        getAppPullStats,
        getSingleAppRates,
        getRarityStats,
        getDailyStats
    }
}