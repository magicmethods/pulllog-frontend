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

}
export {}
