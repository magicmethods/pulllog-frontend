<script setup lang="ts">
//import { useAppStore } from '~/stores/useAppStore'
import { getLabelsAndMap } from '~/utils/date'
import { getCurrencyData, getExpenseStepSize, getExpenseYAxisMax } from '~/utils/currency'

// Props & Emits
const props = defineProps<{
    chartData: ChartDataPoint[]
    range: number // グラフ範囲の日数
    currencyCode: string // アプリごとの通貨コード
}>()

// Stores
//const appStore = useAppStore()

// 色設定
const isDarkMode = computed(() => document.documentElement.classList.contains('app-dark')) // ダークモードの状態を取得 useUsrStore.isDarkMode
const palette = computed(() => isDarkMode.value
    ? {
        rare: 'oklch(79.5% 0.184 86.047)', other: 'oklch(54.1% 0.281 293.009)', expense: 'oklch(71.8% 0.202 349.761 / .6)',
        bg: 'oklch(13% 0.028 261.692)', text: 'oklch(92.8% 0.006 264.531)',
        grid: 'oklch(37.3% 0.034 259.733)', axis: 'oklch(70.7% 0.022 261.325)', legend: 'oklch(92.8% 0.006 264.531)',
        tooltipBg: 'oklch(21% 0.034 264.665)', tooltipText: 'oklch(92.8% 0.006 264.531)', tooltipBorder: 'oklch(37.3% 0.034 259.733)'
    }
    : {
        rare: 'oklch(76.9% 0.188 70.08)', other: 'oklch(60.6% 0.25 292.717)', expense: 'oklch(74% 0.238 322.16 / .5)',
        bg: '#fff', text: 'oklch(27.9% 0.041 260.031)',
        grid: 'oklch(92.9% 0.013 255.508)', axis: 'oklch(70.4% 0.04 256.788)', legend: 'oklch(27.9% 0.041 260.031)',
        tooltipBg: '#fff', tooltipText: 'oklch(27.9% 0.041 260.031)', tooltipBorder: 'oklch(92.9% 0.013 255.508)'
    }
)

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
        label: `課金額 (${currencySymbol.value})`,
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
        label: 'その他排出数',
        stack: 'pulls',
        data: points.map(d => Number(d.total_pulls || 0) - Number(d.rare_pulls || 0)),
        backgroundColor: palette.value.other,
    },
    {
        type: 'bar' as const,
        label: '最高レア排出数',
        stack: 'pulls',
        data: points.map(d => Number(d.rare_pulls || 0)),
        backgroundColor: palette.value.rare,
    },
])

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
            title:  { color: palette.value.text, display: true, text: 'ガチャ回数' },
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
            title:  { color: palette.value.text, display: true, text: `課金額 (${currencySymbol.value})` },
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
            title:  { color: palette.value.text, display: false, text: '日付' },
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
