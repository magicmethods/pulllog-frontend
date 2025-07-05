/**
 * チャート用
 */
declare global {
    type ChartRange = '1m' | '3m' | '6m' | '1y'
    type RangeOption = {
        label: string
        value: ChartRange
        days: number
        startDate?: string // YYYY-MM-DD形式
        endDate?: string // YYYY-MM-DD形式
    }
    type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'polarArea' | 'bubble' | 'scatter'
    type ChartDataPoint = {
        date: string // YYYY-MM-DD形式
        [key: string]: number | string // その他のキーは数値または文字列
    }
    type SeriesSetting = {
        key: string
        label: string
        type: ChartType
        backgroundColor?: string
        borderColor?: string
        stack?: string
        yAxisID?: string
        tension?: number
        fill?: boolean
    }
    // biome-ignore lint:/suspicious/noExplicitAny Chart.js のコールバック引数である Context の型
    type ContextModel = any
    /** グラフカラーパレット型 */
    type ChartPalette = {
        rare: string // レア排出数
        other: string // その他排出数
        expense: string // 課金額
        bg: string // 背景色
        text: string // 文字色
        grid: string // グリッド線色
        axis: string // 軸線色
        legend: string // 凡例色
        tooltipBg: string // ツールチップ背景色
        tooltipText: string // ツールチップ文字色
        tooltipBorder: string // ツールチップ枠線色
        [key: string]: string // 拡張用
    }
    /** プリセットチャートカラーパレット */
    type ChartColor = {
        bg: string // 背景色
        hover: string // ホバー時の色
        border: string // 枠線の色
        text?: string // 文字色
        annotation?: string // 補助線・注釈の色
    }
    type ColorMap = Record<string, ChartColor>
    /** アプリ課金額割合（Pieチャート）用データ */
    type PieChartData = {
        appId: string
        appName: string
        currency: string // 通貨単位
        value: number
    }[]
    /** アプリ課金額推移（StackedBarチャート）用データ */
    interface StackedBarRow {
        month: string // 'YYYY-MM'
        [appId: string]: number | string // 各アプリの月ごとの課金額
    }
    type StackedBarData = StackedBarRow[]
    /** 日別ガチャ回数・レア排出数（Lineチャート）用データ */
    type LineChartData = {
        date: string // 'YYYY-MM-DD'
        pulls: number
        rareDrops: number
        cumulativePulls: number
        cumulativeRareDrops: number
        rate: number // %
    }[]
    type CumulativeRareRate = {
        appId: string
        rate: LineChartData
    }[]
    /** アプリごとのガチャ回数・レア排出数（AppPullStats）用データ */
    type AppPullStats = {
        appId: string
        appName: string
        pulls: number
        rareDrops: number
        rareRate: number // %
    }


}
export {}
