<script setup lang="ts">
import {
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    type ChartType,
    Legend,
    LinearScale,
    LineController,
    LineElement,
    PieController,
    PointElement,
    Tooltip,
} from "chart.js"
import annotationPlugin from "chartjs-plugin-annotation"
// biome-ignore lint/correctness/noUnusedImports: used in template
import { Chart as VueChart } from "vue-chartjs"

// Chart.jsのコンポーネントを一括登録
ChartJS.register(
    BarController,
    BarElement,
    LineController,
    LineElement,
    ArcElement,
    PieController,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
    annotationPlugin,
)

// Props & Emits
const props = defineProps<{
    type: ChartType // 'bar', 'line', 'pie', 'doughnut', etc.
    // biome-ignore lint:/suspicious/noExplicitAny
    data: any
    // biome-ignore lint:/suspicious/noExplicitAny
    options?: any // ChartOptions
    // biome-ignore lint:/suspicious/noExplicitAny
    plugins?: any[] // Chart.jsのプラグイン
    chartId?: string // Chartコンテナ要素のID
    width?: number | string // Chartコンテナ要素の幅
    height?: number | string // Chartコンテナ要素の高さ
    addClass?: string // 追加のクラス名
}>()
/**
 * usage:
 * ```
 * <Chart v-bind="chartProps" @chartReady="onChartReady" />
 *
 * function onChartReady(chartInstance: ChartJS) {
 *   chartInstance.data.datasets[0].backgroundColor = '#f00'
 *   chartInstance.update()
 * }
 * ```
 */
const emit = defineEmits<(e: "chartReady", chart: ChartJS) => void>()

// Refs & Computed
const chartRef = ref<{ chart: ChartJS } | null>(null)
const chartType = computed<ChartType>(() => props.type ?? "bar") // デフォルトは'bar'
const containerId = computed(() => props.chartId ?? `chart-${props.type}`)
const containerStyle = computed(() => {
    return {
        width: props.width
            ? typeof props.width === "number"
                ? `${props.width}px`
                : props.width
            : undefined,
        height: props.height
            ? typeof props.height === "number"
                ? `${props.height}px`
                : props.height
            : undefined,
    }
})
const containerClass = computed(() => {
    return `chart-${props.type} w-full h-full relative ${props.addClass ?? ""}`
})

// Lifecycle hooks
onMounted(() => {
    if (chartRef.value?.chart) {
        // 初期化後に何か処理が必要ならここに記述
        emit("chartReady", chartRef.value.chart as ChartJS)
    }
})
</script>

<template>
    <div
        :id="containerId"
        :class="containerClass"
        :style="containerStyle"
    >
        <VueChart
            ref="chartRef"
            :type="chartType"
            :data="props.data"
            :options="props.options"
            :plugins="props.plugins"
            class="w-full h-full"
            v-bind="$attrs"
        />
    </div>
</template>
