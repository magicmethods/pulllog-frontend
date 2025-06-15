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
}
export {}
