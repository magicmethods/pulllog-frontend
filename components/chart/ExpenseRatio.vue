<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCurrencyStore } from '~/stores/useCurrencyStore'
import { useChartPalette } from '~/composables/useChart'
import { strBytesTruncate } from '~/utils/string'

// Props
const props = defineProps<{
    data: PieChartData
    colors?: ColorMap // appId: ChartColor
    width?: number
    height?: number
}>()

// Stores etc.
const currencyStore = useCurrencyStore()
const { t, locale } = useI18n()

// Composables
const { theme, palette, presetColors } = useChartPalette()

// アプリごとの色マッピング
const colorMap = computed<ColorMap>(() => {
    const map: ColorMap = {}
    const preset = presetColors.value
    // props.colors優先、なければプリセット順割当
    props.data.forEach((item, i) => {
        if (props.colors?.[item.appId]) {
            map[item.appId] = props.colors[item.appId]
        } else {
            // 余った分はプリセット10色からループ割り当て
            map[item.appId] = preset[i % preset.length]
        }
    })
    return map
})

const totalExpense = computed(() => props.data.reduce((sum, item) => sum + (item.value ?? 0), 0))
const isNoData = computed(() => totalExpense.value === 0)

// 通貨コードごとに合算
const totalsByCurrency = computed<Map<string, number>>(() => {
    const m = new Map<string, number>()
    for (const it of props.data) {
        const code = (it.currency ?? '').toUpperCase()
        if (!code) continue
        m.set(code, (m.get(code) ?? 0) + (it.value ?? 0))
    }
    return m
})
const totalChips = computed(() => {
    return Array.from(totalsByCurrency.value.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, total]) => ({
            code,
            label: currencyStore.formatDecimal(total, code, locale.value),
        }))
})

// グラフデータ
const chartData = computed(() => {
    if (isNoData.value) {
        return {
            labels: [t('stats.chart.expenseRatio.noData')],
            datasets: [{
                label: t('stats.chart.expenseRatio.noData'),
                currency: props.data.map(item => item.currency) ?? [''],
                data: [1],
                backgroundColor: [palette.value.grid],
                hoverBackgroundColor: [palette.value.grid],
                borderColor: [palette.value.grid],
                borderWidth: 2,
            }]
        }
    }
    return {
        labels: props.data.map(item => item.appName),
        datasets: [{
            label: t('stats.chart.expenseRatio.expenseLabel'),
            currency: props.data.map(item => item.currency),
            data: props.data.map(item => item.value),
            backgroundColor: props.data.map(item => colorMap.value[item.appId].bg),
            hoverBackgroundColor: props.data.map(item => colorMap.value[item.appId].hover),
            borderColor: props.data.map(item => colorMap.value[item.appId].border),
            borderWidth: 2,
            borderAlign: 'center',
            offset: 1,
            hoverOffset: 2,
        }]
    }
})
// グラフオプション
const chartOptions = computed(() => ({
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            enabled: !isNoData.value,
            backgroundColor: palette.value.tooltipBg, // ツールチップ背景
            titleColor: palette.value.tooltipText, // タイトル文字色
            bodyColor: palette.value.tooltipText, // 本文文字色
            borderColor: palette.value.tooltipBorder, // ボーダー色
            borderWidth: 1,
            callbacks: !isNoData.value ? {
                title: (ctx: ContextModel) => {
                    const titleString = ctx[0].label || ctx.dataset.label
                    const maxWidth = (props.width ?? 160) * 0.5
                    return strBytesTruncate(titleString, 7, maxWidth)
                },
                label: (ctx: ContextModel) => {
                    const code = ctx.dataset.currency[ctx.dataIndex]
                    return currencyStore.formatDecimal(ctx.parsed, code, locale.value)
                },
            } : {}
        }
    },
    responsive: true,
    maintainAspectRatio: false
}))

const decimalValue = computed(() => {
    return isNoData.value
        ? currencyStore.formatDecimal(0, chartData.value.datasets[0].currency[0], locale.value)
        : currencyStore.formatDecimal(chartData.value.datasets[0].data.reduce((sum, value) => sum + value, 0), chartData.value.datasets[0].currency[0], locale.value)
})

// ツールチップを表示する
function showTooltip() {
    return {
        value: t('stats.chart.expenseRatio.currencyNoteLong'),
        escape: false,
        pt: {
            root: 'pt-1',
            text: 'w-max max-w-[30rem] p-3 bg-surface-600 text-white dark:bg-gray-800 dark:shadow-lg font-medium text-xs',
            arrow: 'w-2 h-2 rotate-[45deg] border-b border-4 border-surface-600 dark:border-gray-800',
        }
    }
}

</script>

<template>
    <Card class="chart-card">
        <template #title>
            <h3 class="text-base">
                <span class="text-primary-800 dark:text-primary-400 mr-0.5">
                    {{ t('stats.chart.expenseRatio.expenseLabel') }}
                </span>
                {{ t('stats.chart.expenseRatio.ratioLabel') }}
            </h3>
        </template>
        <template #content>
            <div class="flex justify-around items-center gap-4">
                <div id="expenseRatioPieChart" class="relative h-max w-max">
                    <CommonChart
                        type="pie"
                        :data="chartData"
                        :options="chartOptions"
                        :width="width ?? 160"
                        :height="height ?? 160"
                        :key="theme"
                    />
                </div>
                <div class="flex flex-col gap-2">
                    <div v-for="(color, appId) in colorMap" :key="appId" class="flex items-center">
                        <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: color.bg }"></div>
                        <span class="ml-2 w-[10rem] text-sm text-surface-600 dark:text-gray-400 truncate">
                            {{ data.find(item => item.appId === appId)?.appName }}
                        </span>
                        <span class="ml-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                            {{
                                currencyStore.formatDecimal(
                                    data.find(item => item.appId === appId)?.value || 0,
                                    data.find(item => item.appId === appId)?.currency ?? '',
                                    locale
                                )
                            }}
                        </span>
                    </div>
                </div>
            </div>
        </template>

        <template #footer>
            <div class="text-sm text-gray-500 dark:text-gray-400 mt-4">
                <span class="font-semibold mr-2">{{ t('stats.chart.expenseRatio.totalLabel') }}:</span>
                <template v-if="!isNoData && totalChips.length">
                    <ul class="inline-flex flex-wrap gap-2 align-middle">
                        <li
                            v-for="c in totalChips"
                            :key="c.code"
                            class="px-2 py-0.5 rounded bg-surface-100 dark:bg-[#111827]"
                        >
                            <span class="font-semibold text-primary-600 dark:text-primary-400">{{ c.label }}</span>
                            <span class="ml-1 text-[11px] text-gray-500">({{ c.code }})</span>
                        </li>
                    </ul>                    
                </template>
                <template v-else>
                    <span class="font-semibold text-primary-600 dark:text-primary-400">{{ decimalValue }}</span>
                </template>
            </div>

            <div class="flex items-center gap-1 mt-4 max-w-full md:max-w-[518px]" v-tooltip.bottom="showTooltip()">
                <i class="pi pi-info-circle text-sm text-blue-600 dark:text-blue-500"></i>
                <div class="text-xs text-blue-600 dark:text-blue-500">
                    {{ t('stats.chart.expenseRatio.currencyNote') }}
                </div>
            </div>
        </template>
    </Card>
</template>
