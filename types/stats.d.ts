/**
 * 統計用データ
 */
declare global {
    /** 旧型・廃止予定 */
    type StatisticsData = {
        start_date: string // 集計開始日: YYYY-MM-DD形式の文字列
        end_date: string // 集計終了日: YYYY-MM-DD形式の文字列
        total_logs: number // 集計期間中の登録ログ数
        months_in_period: number // 集計期間中の月数
        total_pulls: number // ガチャ回数の合計値
        rare_drop_count: number // レア排出数
        rare_drop_rate: number // レア排出率
        total_expense: number // ガチャにかかった費用の合計値
        average_monthly_expense: number // 月毎の平均費用
        average_expense: number // レア排出1回あたりの平均費用
        average_rare_drop_rate: number // レア排出率の平均値（レア排出１回あたりのガチャ回数）
    }
    /** 統計データのグラフ/テーブル対応: 統計ページなど */
    type StatisticsView = StatisticsData & {
        rareDropRatePercent: string // "7.5%" 等
        averageExpensePerPull: string // "¥300/回" 等
    }
    /** 新型・推奨 */
    interface StatsData {
        appId: string
        currencyCode: string // 通貨コード（例: 'JPY', 'USD'）
        minorUnit: number // 通貨の最小単位（例: JPYなら0, USDなら2）
        startDate: string // 集計開始日: YYYY-MM-DD形式の文字列
        endDate: string // 集計終了日: YYYY-MM-DD形式の文字列
        totalLogs: number // 集計期間中の登録ログ数
        monthsInPeriod: number // 集計期間中の月数
        totalPulls: number // ガチャ回数の合計値
        rareDropCount: number // レア排出数
        rareDropRate: number // レア排出率
        totalExpense: number // ガチャにかかった費用の合計値
        averageExpense: number // レア排出1回あたりの平均費用
        averageMonthlyExpense: number // 月毎の平均費用
        averageRareDropRate: number // レア排出率の平均値（レア排出１回あたりのガチャ回数）
        // 追加項目: [拡張可能]
        // monthlyExpense?: Record<string, number> // 月ごとの費用（YYYY-MM形式のキー）
    }
    /** 統計キャッシュのMap型 */
    type StatsMap = Map<string, Map<string, StatsData>> // appId -> queryKey -> StatsData


}
export {}
