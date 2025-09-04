<script setup lang="ts">
import type { Chart as ChartJS } from "chart.js"
import ChartDataLabels from "chartjs-plugin-datalabels"
import { useI18n } from "vue-i18n"

// Props
const props = defineProps<{
    data: AppPullStats[]
    colors?: ColorMap // オプション
}>()

// i18n
const { t } = useI18n()

// カラーパレット
const { theme, presetColors, palette, ceilMaxDigit } = useChartPalette()

// 色マップ
const colorMap = computed<ColorMap>(() => {
    const map: ColorMap = {}
    const preset = presetColors.value
    props.data.forEach((item, i) => {
        map[item.appId] =
            props.colors?.[item.appId] ?? preset[i % preset.length]
    })
    return map
})

const maxPulls = computed(() => ceilMaxDigit(props.data.map((a) => a.pulls)))
const maxRare = computed(() => ceilMaxDigit(props.data.map((a) => a.rareDrops)))
const yLabels = computed(() =>
    props.data.map((item) => strBytesTruncate(item.appName, 7, 80)),
)

// グラフデータ
const chartData = computed(() => ({
    labels: yLabels.value,
    datasets: [
        {
            label: t("stats.chart.appPullStats.totalPulls"),
            data: props.data.map((item) => item.pulls),
            backgroundColor: props.data.map(
                (item) => colorMap.value[item.appId].bg,
            ),
            borderColor: props.data.map(
                (item) => colorMap.value[item.appId].border,
            ),
            borderWidth: 1,
            xAxisID: "pulls",
            datalabels: {
                align: "end",
                anchor: "end",
                color:
                    colorMap.value[props.data[0]?.appId]?.bg ??
                    palette.value.text,
                font: { weight: "bold" },
                formatter: (value: number) => value.toLocaleString(),
            },
        },
        {
            label: t("stats.chart.appPullStats.rareDrops"),
            data: props.data.map((item) => item.rareDrops),
            backgroundColor: props.data.map(
                (item) => colorMap.value[item.appId].hover,
            ),
            borderColor: props.data.map(
                (item) => colorMap.value[item.appId].border,
            ),
            borderWidth: 1,
            xAxisID: "rares",
            datalabels: {
                align: "end",
                anchor: "end",
                color:
                    colorMap.value[props.data[0]?.appId]?.hover ??
                    palette.value.text,
                font: { weight: "bold" },
                formatter: (value: number, ctx: ContextModel) =>
                    `${value.toLocaleString()} (${props.data[ctx.dataIndex].rareRate.toFixed(2)}%)`,
            },
        },
    ],
}))

// Chart.jsオプション
const chartOptions = computed(() => ({
    indexAxis: "y", // 横型バー
    plugins: {
        legend: { display: false },
        datalabels: {
            display: true,
            formatter: Math.round,
            font: { weight: "bold" },
        },
        tooltip: {
            enabled: true,
            backgroundColor: palette.value.tooltipBg, // ツールチップ背景
            titleColor: palette.value.tooltipText, // タイトル文字色
            bodyColor: palette.value.tooltipText, // 本文文字色
            borderColor: palette.value.tooltipBorder, // ボーダー色
            borderWidth: 1,
            callbacks: {
                label: (ctx: ContextModel) => {
                    const rareRateText = t(
                        "stats.chart.appPullStats.rareRate",
                        {
                            value: props.data[ctx.dataIndex]?.rareRate.toFixed(
                                2,
                            ),
                        },
                    )
                    return ctx.datasetIndex === 0
                        ? `${ctx.dataset.label}: ${ctx.parsed.x}`
                        : `${ctx.dataset.label}: ${ctx.parsed.x}${rareRateText}`
                },
            },
        },
    },
    scales: {
        pulls: {
            type: "linear",
            position: "top",
            min: 0,
            max: maxPulls.value,
            title: {
                display: true,
                padding: { top: 0 },
                text: t("stats.chart.appPullStats.totalPulls"),
            },
            grid: { drawOnChartArea: false },
            ticks: {
                stepSize: 1000,
                color: palette.value.text,
            },
            border: { color: palette.value.axis },
        },
        rares: {
            type: "linear",
            position: "bottom",
            min: 0,
            max: maxRare.value,
            title: {
                display: true,
                padding: { bottom: 0 },
                text: t("stats.chart.appPullStats.rareDrops"),
            },
            grid: { drawOnChartArea: false },
            ticks: {
                stepSize: 50,
                color: palette.value.text,
            },
            border: { color: palette.value.axis },
        },
        y: {
            // アプリ名
            grid: { color: palette.value.grid },
            ticks: { color: palette.value.text },
            border: { color: palette.value.axis },
        },
    },
    responsive: true,
    maintainAspectRatio: false,
}))

// ChartJS インスタンス取得 + 画像化API公開
const chartIns = ref<ChartJS | null>(null)
function onChartReady(chart: ChartJS) {
    chartIns.value = chart
}
/**
 * 現在のチャートをPNGとして出力
 * @param width 出力幅（px）。未指定はキャンバス幅
 * @param background 背景色（CSSカラー）。未指定は透過
 */
async function toImage(
    width?: number,
    background?: string | null,
): Promise<Blob> {
    const canvas = chartIns.value?.canvas
    if (!canvas) throw new Error("chart not ready")
    const srcW = canvas.width
    const srcH = canvas.height
    const targetW = typeof width === "number" && width > 0 ? width : srcW
    const targetH = Math.round((targetW / srcW) * srcH)
    const off = document.createElement("canvas")
    off.width = targetW
    off.height = targetH
    const ctx = off.getContext("2d")
    if (!ctx) throw new Error("canvas context not available")
    if (background) {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, targetW, targetH)
    }
    ctx.drawImage(canvas, 0, 0, targetW, targetH)
    const blob: Blob | null = await new Promise((resolve) =>
        off.toBlob((b) => resolve(b), "image/png"),
    )
    if (!blob) throw new Error("failed to export image")
    return blob
}
defineExpose({ toImage })
</script>

<template>
    <Card class="chart-card">
        <template #title>
            <h3 class="text-base">
                <span class="text-primary-800 dark:text-primary-400 mx-0.5">{{ t('stats.chart.appPullStats.title') }}</span>
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
                    @chartReady="onChartReady"
                />
            </div>
        </template>
    </Card>
</template>
