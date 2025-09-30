<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { useChartPalette } from "~/composables/useChart"
import { useAppStore } from "~/stores/useAppStore"
import { useUserStore } from "~/stores/useUserStore"
import { strBytesTruncate } from "~/utils/string"

// Types
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
type ChartColor = {
    bg: string // 背景色
    hover: string // ホバー時の色
    border: string // 枠線の色
    annotation?: string // 平均線の色（オプション）
}
type ColorMap = Record<string, ChartColor>
// biome-ignore lint:/suspicious/noExplicitAny
type CallbackArgumentObject = Record<string, any>

// Props
const props = defineProps<{
    data: CumulativeRareRate
    maxRate: number
    colors?: ColorMap // appId: ChartColor
}>()

// Stores etc.
const userStore = useUserStore()
const appStore = useAppStore()
const { t } = useI18n()

// Composables
const { theme, palette, presetColors } = useChartPalette()

// X軸（日付）: 最初の系列の全日付
const xLabels = computed<string[]>(() => {
    return props.data.length > 0
        ? props.data[0].rate.map((row) => row.date)
        : []
})

// アプリID一覧
const appIds = computed<string[]>(() => props.data.map((item) => item.appId))
// アプリ名ラベル
const appLabels = computed<string[]>(() => {
    return appIds.value.map((appId) => {
        const appName =
            appStore.appList.find((app) => app.appId === appId)?.name || appId
        return strBytesTruncate(appName, 7, 80)
    })
})

// アプリごとの色
const colorMap = computed<ColorMap>(() => {
    const map: ColorMap = {}
    const preset = presetColors.value
    appIds.value.forEach((appId, i) => {
        map[appId] = props.colors?.[appId] ?? preset[i % preset.length]
    })
    return map
})

// 折れ線グラフのdatasets
const datasets = computed(() => {
    return props.data.map((item, i) => {
        const appId = item.appId
        return {
            label: appLabels.value[i],
            data: item.rate.map((row) => row.rate),
            backgroundColor: colorMap.value[appId].bg,
            borderColor: colorMap.value[appId].border,
            pointBackgroundColor: colorMap.value[appId].bg,
            pointBorderColor: colorMap.value[appId].border,
            pointHoverBackgroundColor: colorMap.value[appId].hover,
            pointHoverBorderColor: colorMap.value[appId].hover,
            fill: false,
            tension: 0,
            borderWidth: 2,
        }
    })
})

// 平均レア排出率計算（アプリごと）
const averageRates = computed<number[]>(() => {
    return props.data.map((app) =>
        app.rate.length > 0
            ? app.rate.reduce((sum, row) => sum + row.rate, 0) / app.rate.length
            : 0,
    )
})

// グラフデータ
const chartData = computed(() => ({
    labels: xLabels.value,
    datasets: datasets.value,
}))

// グラフオプション
const chartOptions = computed(() => ({
    plugins: {
        legend: {
            display: false,
            position: "bottom",
        },
        tooltip: {
            enabled: true,
            backgroundColor: palette.value.tooltipBg,
            titleColor: palette.value.tooltipText,
            bodyColor: palette.value.tooltipText,
            borderColor: palette.value.tooltipBorder,
            borderWidth: 1,
            callbacks: {
                title: (ctx: ContextModel) => {
                    const label = ctx[0]?.label || ctx.dataset?.label
                    return strBytesTruncate(label, 7, 120)
                },
                label: (ctx: ContextModel) => {
                    // ctx.dataset.label（アプリ名）, ctx.parsed.y（値: %）
                    const label = ctx.dataset.label
                    const value = ctx.parsed.y
                    return `${label}: ${value?.toFixed(2)}%`
                },
            },
        },
        annotation: {
            annotations: props.data.reduce((acc, app, idx) => {
                acc[`avgLine${idx}`] = {
                    type: "line",
                    yMin: averageRates.value[idx],
                    yMax: averageRates.value[idx],
                    borderColor:
                        averageRates.value[idx] > 0
                            ? (colorMap.value[app.appId]?.annotation ??
                              palette.value.annotationBorder)
                            : "transparent",
                    borderWidth: 2,
                    borderDash: [4, 4],
                    label: {
                        display: averageRates.value[idx] > 0,
                        content: t("stats.chart.cumulativeRareRate.average", {
                            value: averageRates.value[idx].toFixed(2),
                        }),
                        position: "start",
                        color:
                            colorMap.value[app.appId]?.annotation ??
                            palette.value.annotationText,
                        backgroundColor: palette.value.annotationBg,
                        font: { weight: "bold", size: 10 },
                    },
                }
                return acc
            }, {} as CallbackArgumentObject),
        },
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: {
            grid: { display: false },
            ticks: { color: palette.value.text },
            border: { color: palette.value.axis },
        },
        y: {
            grid: { color: palette.value.grid },
            ticks: {
                color: palette.value.text,
                callback: (val: number) => `${val}%`,
            },
            border: { color: palette.value.axis },
            min: 0,
            max: props.maxRate ?? 100,
        },
    },
}))
</script>

<template>
    <Card class="chart-card" :pt="{ caption: 'w-full' }">
        <template #title>
            <div class="flex items-center justify-between gap-3">
                <h3 class="text-base">
                    <span class="text-primary-800 dark:text-primary-400 mx-0.5">{{ t('stats.chart.cumulativeRareRate.titleLabel') }}</span>
                    {{ t('stats.chart.cumulativeRareRate.subtitle') }}
                </h3>
                <slot name="titleControls"></slot>
            </div>
        </template>
        <template #content>
            <div id="cumulativeRareRateChart" class="relative h-[20rem] w-full">
                <CommonChart
                    type="line"
                    :data="chartData"
                    :options="chartOptions"
                    :key="theme"
                />
            </div>
        </template>
    </Card>
</template>