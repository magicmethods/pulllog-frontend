<script setup lang="ts">
import type {
    ChartData,
    Chart as ChartJS,
    ChartOptions,
    ChartType,
    Plugin,
} from "chart.js"
import type { Component } from "vue"
import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue"

type ChartDataLike = ChartData<ChartType> | Record<string, unknown>
type ChartOptionsLike = ChartOptions<ChartType> | Record<string, unknown>
type ChartPluginLike = Plugin<ChartType> | Record<string, unknown>

const props = defineProps<{
    type: ChartType
    data: ChartDataLike
    options?: ChartOptionsLike
    plugins?: ChartPluginLike[]
    chartId?: string
    width?: number | string
    height?: number | string
    addClass?: string
}>()

const emit = defineEmits<(e: "chartReady", chart: ChartJS) => void>()

const chartComponent = shallowRef<Component | null>(null)
const chartRef = ref<{ chart?: ChartJS } | null>(null)
const isLoading = ref(true)

const chartType = computed<ChartType>(() => props.type ?? "bar")
const containerId = computed(() => props.chartId ?? `chart-${props.type}`)
const containerStyle = computed(() => {
    const width =
        typeof props.width === "number" ? `${props.width}px` : props.width
    const height =
        typeof props.height === "number" ? `${props.height}px` : props.height
    return {
        width,
        height,
    }
})

const containerClass = computed(() => {
    const base = `chart-${props.type} w-full h-full relative`
    return props.addClass ? `${base} ${props.addClass}` : base
})

let loadPromise: Promise<void> | null = null

function resolvePlugin<TType extends ChartType>(
    module: unknown,
): Plugin<TType> {
    if (module && typeof module === "object" && "default" in module) {
        return (module as { default: Plugin<TType> }).default
    }
    return module as Plugin<TType>
}

async function loadChartModules() {
    if (!loadPromise) {
        loadPromise = (async () => {
            const chartModule = await import("chart.js")
            const annotationModule = await import("chartjs-plugin-annotation")
            const datalabelsModule = await import("chartjs-plugin-datalabels")
            const vueChartModule = await import("vue-chartjs")

            chartModule.Chart.register(
                ...chartModule.registerables,
                resolvePlugin(annotationModule),
                resolvePlugin(datalabelsModule),
            )
            const datalabelsDefaults = { display: false } as const
            if (typeof chartModule.Chart.defaults.set === "function") {
                chartModule.Chart.defaults.set(
                    "plugins.datalabels",
                    datalabelsDefaults,
                )
            } else if (chartModule.Chart.defaults.plugins) {
                chartModule.Chart.defaults.plugins.datalabels = {
                    ...(chartModule.Chart.defaults.plugins.datalabels || {}),
                    ...datalabelsDefaults,
                }
            }

            chartComponent.value = (
                vueChartModule as { Chart: Component }
            ).Chart
        })()
    }
    await loadPromise
}

function emitChartReady() {
    const chart = chartRef.value?.chart
    if (chart) {
        emit("chartReady", chart)
    }
}

onMounted(async () => {
    await loadChartModules()
    isLoading.value = false
    await nextTick()
    emitChartReady()
})

watch(
    () => chartRef.value?.chart,
    (chart) => {
        if (chart) {
            emit("chartReady", chart)
        }
    },
)
</script>

<template>
    <ClientOnly>
        <template #default>
            <div
                :id="containerId"
                :class="containerClass"
                :style="containerStyle"
            >
                <component
                    v-if="!isLoading && chartComponent"
                    :is="chartComponent"
                    ref="chartRef"
                    :type="chartType"
                    :data="props.data"
                    :options="props.options"
                    :plugins="props.plugins"
                    class="h-full w-full"
                    v-bind="$attrs"
                />
                <div
                    v-else
                    class="flex h-full w-full items-center justify-center"
                    role="status"
                    aria-label="loading chart"
                >
                    <span class="loading loading-spinner text-primary" />
                </div>
            </div>
        </template>
        <template #fallback>
            <div
                :id="containerId"
                :class="containerClass"
                :style="containerStyle"
                class="flex items-center justify-center"
                role="status"
                aria-label="loading chart"
            >
                <span class="loading loading-spinner text-primary" />
            </div>
        </template>
    </ClientOnly>
</template>
