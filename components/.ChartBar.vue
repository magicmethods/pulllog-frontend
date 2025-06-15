<script setup lang="ts">
import {
    Chart,
    BarController, BarElement, LineController, LineElement,
    CategoryScale, LinearScale, PointElement, Tooltip, Legend
} from 'chart.js'
import { Chart as ChartJS } from 'vue-chartjs'
import { useChart } from '~/composables/useChart'
import { useAppStore } from '~/stores/useAppStore'
import { getLabelsAndMap } from '~/utils/date'
import { getExpenseStepSize, getExpenseYAxisMax } from '~/utils/currency'

// Chart.jsのコンポーネントを登録
Chart.register(
    BarController, BarElement, LineController, LineElement,
    CategoryScale, LinearScale, PointElement, Tooltip, Legend
)

// Props & Emits
const props = defineProps<{
    chartData: ChartDataPoint[]
    range: number // グラフ範囲の日数
    currencyCode: string // アプリごとの通貨コード
}>()

// Stores
const appStore = useAppStore()

// --- 色設定（例: Tailwindのクラス名→JS変数で切替） ---
const isDarkMode = computed(() => document.documentElement.classList.contains('app-dark')) // ダークモードの状態を取得 useUsrStore.isDarkMode
const palette = computed(() => isDarkMode.value
    ? {
        rare: 'oklch(79.5% 0.184 86.047)', other: 'oklch(54.1% 0.281 293.009)', expense: 'oklch(71.8% 0.202 349.761 / .6)', bg: 'oklch(13% 0.028 261.692)',
        text: 'oklch(92.8% 0.006 264.531)', grid: 'oklch(37.3% 0.034 259.733)', axis: 'oklch(70.7% 0.022 261.325)', legend: 'oklch(92.8% 0.006 264.531)',
        tooltipBg: 'oklch(21% 0.034 264.665)', tooltipText: 'oklch(92.8% 0.006 264.531)', tooltipBorder: 'oklch(37.3% 0.034 259.733)'
    }
    : {
        rare: 'oklch(76.9% 0.188 70.08)', other: 'oklch(60.6% 0.25 292.717)', expense: 'oklch(74% 0.238 322.16 / .5)', bg: '#fff',
        text: 'oklch(27.9% 0.041 260.031)', grid: 'oklch(92.9% 0.013 255.508)', axis: 'oklch(70.4% 0.04 256.788)', legend: 'oklch(27.9% 0.041 260.031)',
        tooltipBg: '#fff', tooltipText: 'oklch(27.9% 0.041 260.031)', tooltipBorder: 'oklch(92.9% 0.013 255.508)'
    }
)

// Chart.jsデータ・オプション生成はuseChartに分離
const { labels, points } = getLabelsAndMap(props.chartData, props.range)
const currencySymbol = computed(() => {
    const cd = getCurrencyData(props.currencyCode)
    return cd ? cd.symbol_native : ''
})
const seriesSettings: SeriesSetting[] = [
    {
        key: 'expense',
        label: `課金額 (${currencySymbol.value})`,
        type: 'line' as const,
        borderColor: palette.value.expense,
        backgroundColor: palette.value.expense,
        yAxisID: 'y1',
        tension: 0.1,
        fill: false
    },
    {
        key: 'other_pulls',
        label: 'その他排出数',
        type: 'bar' as const,
        backgroundColor: palette.value.other,
        stack: 'pulls'
    },
    {
        key: 'rare_pulls',
        label: '最高レア排出数',
        type: 'bar' as const,
        backgroundColor: palette.value.rare,
        stack: 'pulls'
    },
]
const { chartData, chartOptions } = useChart(points, seriesSettings, labels, {
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
                sort: (a, b) => {
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
            itemSort: (a, b) => b.datasetIndex - a.datasetIndex, // 項目を逆順に
        },
    },
    maintainAspectRatio: false,
    responsive: true,
    scales: {
        y: {
            beginAtZero: true,
            max: calcYAxisMax(points, 'total_pulls', 20), // 最大値自動計算
            ticks: {
                stepSize: 10,
                color: palette.value.text,
                font: { size: 12 },
            },
            grid:   { color: palette.value.grid },
            title:  { color: palette.value.text },
            border: { color: palette.value.axis }
        },
        y1: {
            beginAtZero: true,
            position: 'right',
            max: getExpenseYAxisMax(calcYAxisMax(points, 'expense'), props.currencyCode),
            ticks: {
                stepSize: getExpenseStepSize(props.currencyCode),
                color: palette.value.text,
                font: { size: 12 },
                callback: (v: string | number) => v.toLocaleString(),
            },
            grid:   { color: palette.value.grid },
            title:  { color: palette.value.text, text: `課金額 (${currencySymbol.value})` },
            border: { color: palette.value.axis }
        },
        x: {
            ticks: {
                autoSkip: true,
                maxTicksLimit: labels.length > 12 ? 12 : labels.length,
                color: palette.value.text,
                font: { size: 12 },
            },
            grid:   { color: palette.value.grid },
            title:  { color: palette.value.text },
            border: { color: palette.value.axis }
        }
    }
})
const chartRef = ref<{ chart: Chart } | null>(null)

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

// データ更新時のリフレッシュ
watch(() => props.chartData, () => {
    if (chartRef.value?.chart) {
        chartRef.value.chart.update()
    }
}, { deep: true })

</script>

<template>
    <div class="chart-bar w-full h-full relative" :style="{ backgroundColor: palette.bg }">
        <ChartJS ref="chartRef" type="bar" :data="chartData" :options="chartOptions" class="w-full h-full" />
    </div>
</template>
