<script setup lang="ts">
import ChartDataLabels from 'chartjs-plugin-datalabels'
//import { useChartPalette } from '~/composables/useChart'

// 型定義
type AppPullStats = {
    appId: string
    appName: string
    pulls: number
    rareDrops: number
    rareRate: number // %
}
type ColorMap = Record<string, ChartColor>

// Props
const props = defineProps<{
    data: AppPullStats[]
    colors?: ColorMap // オプション
}>()

// カラーパレット
const { theme, presetColors, palette, ceilMaxDigit } = useChartPalette()

// 色マップ
const colorMap = computed<ColorMap>(() => {
    const map: ColorMap = {}
    const preset = presetColors.value
    props.data.forEach((item, i) => {
        map[item.appId] = props.colors?.[item.appId] ?? preset[i % preset.length]
    })
    return map
})

const maxPulls = computed(() => ceilMaxDigit(props.data.map(a => a.pulls)))
const maxRare = computed(() => ceilMaxDigit(props.data.map(a => a.rareDrops)))
const yLabels = computed(() => props.data.map(item => strBytesTruncate(item.appName, 7, 80)))

// グラフデータ
const chartData = computed(() => ({
    labels: yLabels.value,
    datasets: [
        {
            label: '総ガチャ回数',
            data: props.data.map(item => item.pulls),
            backgroundColor: props.data.map(item => colorMap.value[item.appId].bg),
            borderColor: props.data.map(item => colorMap.value[item.appId].border),
            borderWidth: 1,
            xAxisID: 'pulls',
            datalabels: {
                align: 'end',
                anchor: 'end',
                color: colorMap.value[props.data[0]?.appId]?.bg ?? palette.value.text,
                font: { weight: 'bold' },
                formatter: (value: number) => value.toLocaleString(),
            },
        },
        {
            label: 'レア排出数',
            data: props.data.map(item => item.rareDrops),
            backgroundColor: props.data.map(item => colorMap.value[item.appId].hover),
            borderColor: props.data.map(item => colorMap.value[item.appId].border),
            borderWidth: 1,
            xAxisID: 'rares',
            datalabels: {
                align: 'end',
                anchor: 'end',
                color: colorMap.value[props.data[0]?.appId]?.hover ?? palette.value.text,
                font: { weight: 'bold' },
                formatter: (value: number, ctx: ContextModel) =>
                    `${value.toLocaleString()} (${props.data[ctx.dataIndex].rareRate.toFixed(2)}%)`
            }
        }
    ]
}))

// Chart.jsオプション
const chartOptions = computed(() => ({
    indexAxis: 'y', // 横型バー
    plugins: {
        legend: { display: false },
        datalabels: {
            display: true,
            formatter: Math.round,
            font: { weight: 'bold' }
        },
        tooltip: {
            enabled: true,
            backgroundColor: palette.value.tooltipBg, // ツールチップ背景
            titleColor: palette.value.tooltipText, // タイトル文字色
            bodyColor: palette.value.tooltipText, // 本文文字色
            borderColor: palette.value.tooltipBorder, // ボーダー色
            borderWidth: 1,
            callbacks: {
                label: (ctx: ContextModel) => ctx.datasetIndex === 0
                    ? `${ctx.dataset.label}: ${ctx.parsed.x}`
                    : `${ctx.dataset.label}: ${ctx.parsed.x}（レア率: ${props.data[ctx.dataIndex]?.rareRate.toFixed(2)}%）`
            }
        }
    },
    scales: {
        pulls: {
            type: 'linear',
            position: 'top',
            min: 0,
            max: maxPulls.value,
            title: {
                display: true,
                padding: { top: 0 },
                text: '総ガチャ回数'
            },
            grid: { drawOnChartArea: false },
            ticks: {
                stepSize: 1000,
                color: palette.value.text
            },
            border: { color: palette.value.axis }
        },
        rares: {
            type: 'linear',
            position: 'bottom',
            min: 0,
            max: maxRare.value,
            title: {
                display: true,
                padding: { bottom: 0 },
                text: 'レア排出数'
            },
            grid: { drawOnChartArea: false },
            ticks: {
                stepSize: 50,
                color: palette.value.text
            },
            border: { color: palette.value.axis }
        },
        y: {
            // アプリ名
            grid: { color: palette.value.grid },
            ticks: { color: palette.value.text },
            border: { color: palette.value.axis }
        }
    },
    responsive: true,
    maintainAspectRatio: false
}))
</script>

<template>
    <Card class="relative min-h-[22rem] w-full md:w-max md:max-w-1/3">
        <template #title>
            <h3 class="text-base">
                <span class="text-primary-800 dark:text-primary-400 mx-0.5">引き当て数・レア率</span>
            </h3>
        </template>
        <template #content>
            <div class="relative h-[20rem] w-full">
                <CommonChart
                    type="bar"
                    :data="chartData"
                    :options="chartOptions"
                    :plugins="[ChartDataLabels]"
                    :key="theme"
                />
            </div>
        </template>
    </Card>
</template>
