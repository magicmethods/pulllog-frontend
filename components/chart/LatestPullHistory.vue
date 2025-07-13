<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useChartPalette } from '~/composables/useChart'
import { getLabelsAndMap } from '~/utils/date'
import { getCurrencyData, getExpenseStepSize, getExpenseYAxisMax } from '~/utils/currency'

// Props & Emits
const props = defineProps<{
    chartData: ChartDataPoint[]
    range: number // グラフ範囲の日数
    currencyCode: string // アプリごとの通貨コード
    guaranteeCount?: number // 天井回数（オプション、指定があれば表示）
}>()

// i18n
const { t } = useI18n()

// Composables
const { palette } = useChartPalette()

// X軸ラベル・グラフ用データ配列
const { labels, points } = getLabelsAndMap(props.chartData, props.range)
const currencySymbol = computed(() => {
    const cd = getCurrencyData(props.currencyCode)
    return cd ? cd.symbol_native : ''
})
// グラフデータ
const datasets = computed(() => [
    {
        type: 'line' as const,
        label: t('history.historyChart.expense', { currency: currencySymbol.value }),
        yAxisID: 'y1',
        data: points.map(d => Number(d.expense || 0)),
        borderColor: palette.value.expense,
        backgroundColor: palette.value.expense,
        tension: 0.1,
        fill: false,
        pointRadius: 0, // ポイントサイズ（0: 非表示）
    },
    {
        type: 'bar' as const,
        label: t('history.historyChart.other'),
        stack: 'pulls',
        data: points.map(d => Number(d.total_pulls || 0) - Number(d.rare_pulls || 0)),
        backgroundColor: palette.value.other,
    },
    {
        type: 'bar' as const,
        label: t('history.historyChart.rare'),
        stack: 'pulls',
        data: points.map(d => Number(d.rare_pulls || 0)),
        backgroundColor: palette.value.rare,
    },
])

// 天井補助線のannotations計算
const pityAnnotations = computed(() => {
    if (!props.guaranteeCount) return {}
    // y軸最大値の計算
    const yMax = calcYAxisMax(points, 'total_pulls', 20)
    const interval = props.guaranteeCount
    // biome-ignore lint:/suspicious/noExplicitAny chartjs-plugin-annotation用の型
    const annotations: Record<string, any> = {}
    for (let v = interval; v <= yMax; v += interval) {
        annotations[`pityLine${v}`] = {
            type: 'line',
            yMin: v,
            yMax: v,
            borderColor: palette.value.annotationBorder,
            borderWidth: 1.5,
            borderDash: [4, 4],
            label: {
                enabled: true,
                content: t('history.historyChart.pityLine', { count: v }),
                position: 'start',
                backgroundColor: palette.value.annotationBg,
                color: palette.value.annotationText,
                font: { size: 11, weight: 'bold' },
                yAdjust: -6
            }
        }
    }
    return annotations
})

const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
        legend: {
            position: 'bottom', // 凡例は下部
            labels: {
                color: palette.value.legend,
                usePointStyle: true, // ポイントスタイルを使用
                pointStyle: 'rectRounded', // ポイントの形状
                pointStyleWidth: 12, // ポイントのサイズ
                padding: 15,
                boxHeight: 11,
                font: { size: 12 },
                sort: (
                    // biome-ignore lint:/suspicious/noExplicitAny
                    a: any, b: any
                ) => {
                    const ai = typeof a.datasetIndex === 'number' ? a.datasetIndex : Number.MAX_SAFE_INTEGER
                    const bi = typeof b.datasetIndex === 'number' ? b.datasetIndex : Number.MAX_SAFE_INTEGER
                    return bi - ai // 項目を逆順に
                },
            }
        }, 
        tooltip: {
            backgroundColor: palette.value.tooltipBg, // ツールチップ背景
            titleColor: palette.value.tooltipText, // タイトル文字色
            bodyColor: palette.value.tooltipText, // 本文文字色
            borderColor: palette.value.tooltipBorder, // ボーダー色
            borderWidth: 1,
            itemSort: (
                // biome-ignore lint:/suspicious/noExplicitAny
                a: any, b: any
            ) => b.datasetIndex - a.datasetIndex, // 項目を逆順に
        },
        annotation: {
            annotations: {
                ...pityAnnotations.value, // 天井補助線
            }
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            stacked: true,
            position: 'left' as const,
            max: calcYAxisMax(points, 'total_pulls', 20), // 最大値自動計算
            ticks: {
                stepSize: 10,
                color: palette.value.text,
                font: { size: 12 },
            },
            grid:   { color: palette.value.grid },
            title:  { color: palette.value.text, display: true, text: t('history.historyChart.pulls') },
            border: { color: palette.value.axis }
        },
        y1: {
            beginAtZero: true,
            position: 'right' as const,
            max: getExpenseYAxisMax(calcYAxisMax(points, 'expense'), props.currencyCode),
            ticks: {
                stepSize: getExpenseStepSize(props.currencyCode),
                color: palette.value.text,
                font: { size: 12 },
                callback: (v: string | number) => v.toLocaleString(),
            },
            grid:   { color: palette.value.grid, drawOnChartArea: false },
            title:  { color: palette.value.text, display: true, text: t('history.historyChart.expense', { currency: currencySymbol.value }) },
            border: { color: palette.value.axis }
        },
        x: {
            stacked: true,
            ticks: {
                autoSkip: true,
                maxTicksLimit: labels.length > 12 ? 12 : labels.length,
                maxRotation: 90,
                minRotation: 30,
                color: palette.value.text,
                font: { size: 12 },
            },
            grid:   { color: palette.value.grid },
            title:  { color: palette.value.text, display: false, text: t('history.historyChart.date') },
            border: { color: palette.value.axis }
        }
    }
}))
const chartData = computed(() => ({
    labels,
    datasets: datasets.value
}))

// Methods
/**
 * Y軸最大値を任意の「桁数・単位」で繰り上げて返す
 * @param points - データ配列
 * @param key - 集計対象のキー
 * @param roundUpUnit - 繰り上げ単位（例: 10, 100, 1000 など、デフォルトは最大値の桁数に応じて自動）
 * @param alwaysUpper - 最大値がピッタリ区切りの場合も一段階大きくする（デフォルトtrue）
 * @returns number
 */
function calcYAxisMax(
    // biome-ignore lint:/suspicious/noExplicitAny
    points: any[],
    key: string,
    roundUpUnit?: number,
    alwaysUpper = true
) {
    const max = Math.max(...points.map(d => Number(d[key] ?? 0)))
    if (max === 0) return 1
    // 繰り上げ単位を自動計算 or 指定
    let unit = roundUpUnit
    if (!unit) {
        // 1, 10, 100, 1000...で最大値の桁数に合わせる
        unit = 10 ** Math.floor(Math.log10(max))
    }
    let yMax = Math.ceil(max / unit) * unit
    // ぴったり割り切れていた場合も、常にもう一段階上げたい場合
    if (alwaysUpper && yMax <= max) {
        yMax += unit
    }
    return yMax
}

</script>

<template>
    <div class="chart-bar w-full h-full relative" :style="{ backgroundColor: palette.bg }">
        <CommonChart
            type="bar"
            :data="chartData"
            :options="chartOptions"
        />
    </div>
</template>
