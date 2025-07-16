<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useUserStore } from '~/stores/useUserStore'
import { useAppStore } from '~/stores/useAppStore'
import { useChartPalette } from '~/composables/useChart'
import { formatCurrency } from '~/utils/currency'
import { strBytesTruncate } from '~/utils/string'

// Props
const props = defineProps<{
    data: StackedBarData
    colors?: ColorMap // appId: ChartColor
}>()

// Stores etc.
const userStore = useUserStore()
const appStore = useAppStore()
const { t, locale } = useI18n()

// Composables
const { theme, palette, presetColors } = useChartPalette()

// アプリIDリストをprops.dataから抽出
const appIds = computed<string[]>(() => {
    // 最初のrowでアプリIDを抽出（'month'以外）
    const row = props.data[0]
    if (!row) return []
    return Object.keys(row).filter(k => k !== 'month')
})

// アプリ名リスト（表示用ラベル）
const appLabels = computed<string[]>(() => {
    return appIds.value.map(appId => {
        const appName = appStore.appList.find(app => app.appId === appId)?.name || appId
        return strBytesTruncate(appName, 7, 80)
    })
})

// グラフの通貨単位を取得・定義する
const fixCurrency = computed<string>(() => {
    const defaultCurrency = locale.value === 'ja' ? 'JPY' : (locale.value === 'zh' ? 'CNY' : 'USD') // デフォルトの通過単位
    const appCurrencyCodes = appIds.value.map(appId => {
        const app = appStore.appList.find(app => app.appId === appId)
        if (!app || !app.currency_unit) return defaultCurrency
        const currencyData = getCurrencyData(app.currency_unit)
        return currencyData ? currencyData.code : defaultCurrency
    })
    console.log('MonthlyExpenseStack::fixCurrency(List):', appCurrencyCodes, locale.value)
    // 最初のアプリの通貨単位を基準にする
    return appCurrencyCodes[0]
})

// アプリごとの色マッピング
const colorMap = computed<ColorMap>(() => {
    const map: ColorMap = {}
    const preset = presetColors.value
    // props.colors優先、なければプリセット順割当
    appIds.value.forEach((appId, i) => {
        map[appId] = props.colors?.[appId] ?? preset[i % preset.length]
    })
    return map
})

// 平均課金額（全アプリ合計額の平均）
const averageExpense = computed(() => {
    // 各行(month)ごとに全アプリの合計
    const monthSums = props.data.map(row => {
        return Object.entries(row)
            .filter(([key]) => key !== 'month')
            .reduce((sum, [, val]) => sum + Number(val || 0), 0)
    })
    return monthSums.length > 0
        ? monthSums.reduce((a, b) => a + b, 0) / monthSums.length
        : 0
})

// 全月・全アプリの最大課金額
const maxExpense = computed(() => {
    const allValues = props.data.flatMap(row =>
        appIds.value.map(appId => Number(row[appId] ?? 0))
    )
    return allValues.length ? Math.max(...allValues) : 0
})

// 最低課金額（0以外の最小値、なければ0）
const minExpense = computed(() => {
    const values = props.data.flatMap(row =>
        appIds.value.map(appId => Number(row[appId] ?? 0))
    ).filter(val => val > 0)
    return values.length ? Math.min(...values) : 0
})

// 最適なY軸最大値・ステップ計算
const yAxisConfig = computed(() => {
    let max: number
    let step: number

    // すべて0なら
    if (maxExpense.value === 0) {
        // JPYなら1000円
        //const appCurrency = getCurrencyData(appStore.app?.currency_unit || 'JPY')?.code
        if (fixCurrency.value === 'JPY') {
            max = 1000
            step = 500
        } else {
            // 他通貨なら最小課金額*2（最低値100）
            max = Math.max((minExpense.value || 50) * 2, 100)
            step = Math.max(Math.floor(max / 2), 1)
        }
    } else {
        // そうでなければ最大値*1.1を切り上げ
        max = Math.ceil(maxExpense.value * 1.1)
        // ステップはmaxの半分を切り上げ、1未満にはしない
        step = Math.max(Math.ceil(max / 2), 1)
    }
    return { max, step }
})

// グラフデータ
const chartData = computed(() => ({
    labels: props.data.map(row => row.month), // X軸（月）
    datasets: appIds.value.map((appId, i) => ({
        label: appLabels.value[i], // 本来はアプリ名
        data: props.data.map(row => Number(row[appId] ?? 0)),
        backgroundColor: colorMap.value[appId].bg,
        hoverBackgroundColor: colorMap.value[appId].hover,
        borderColor: colorMap.value[appId].border,
        stack: 'stack-0',
        barPercentage: 0.7,
        borderWidth: 1,
    }))
}))

// グラフオプション
const chartOptions = computed(() => ({
    plugins: {
        legend: {
            display: false,
            position: 'bottom',
        },
        tooltip: {
            enabled: true,
            backgroundColor: palette.value.tooltipBg, // ツールチップ背景
            titleColor: palette.value.tooltipText, // タイトル文字色
            bodyColor: palette.value.tooltipText, // 本文文字色
            borderColor: palette.value.tooltipBorder, // ボーダー色
            borderWidth: 1,
            callbacks: {
                title: (ctx: ContextModel) => {
                    const titleString = ctx[0]?.label || ctx.dataset?.label
                    return strBytesTruncate(titleString, 7, 120)
                },
                label: (ctx: ContextModel) => {
                    // ctx.dataset.label（アプリ名）, ctx.parsed.y（値）
                    const appLabel = ctx.dataset.label
                    const value = ctx.parsed.y
                    return `${appLabel}: ${formatCurrency(value, fixCurrency.value, locale.value)}`
                },
            }
        },
        annotation: {
            annotations: {
                avgLine: {
                    type: 'line',
                    yMin: averageExpense.value,
                    yMax: averageExpense.value,
                    borderColor: averageExpense.value > 0 ? palette.value.annotationBorder : 'transparent',
                    borderWidth: 2,
                    borderDash: [4, 4],
                    label: {
                        display: averageExpense.value > 0,
                        content: t('stats.chart.monthlyExpenseStack.average', { value: formatCurrency(averageExpense.value, fixCurrency.value, locale.value) }),
                        position: 'start',
                        color: palette.value.annotationText,
                        backgroundColor: palette.value.annotationBg,
                        font: { weight: 'bold', size: 10 }
                    }
                }
            }
        },
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: palette.value.text },
            border: { color: palette.value.axis }
        },
        y: {
            stacked: true,
            grid: { color: palette.value.grid },
            min: 0,
            max: maxExpense.value === 0 ? yAxisConfig.value.max : undefined,
            ticks: {
                color: palette.value.text,
                stepSize: maxExpense.value === 0 ? yAxisConfig.value.step: undefined,
                callback: (val: number) => formatCurrency(Number(val), fixCurrency.value, locale.value)
            },
            border: { color: palette.value.axis }
        }
    }
}))

</script>

<template>
    <Card class="min-h-[20rem] flex-grow">
        <template #title>
            <h3 class="text-base">
                {{ t('stats.chart.monthlyExpenseStack.titlePrefix') }}
                <span class="text-primary-800 dark:text-primary-400 mx-0.5">{{ t('stats.chart.monthlyExpenseStack.titleLabel') }}</span>
                {{ t('stats.chart.monthlyExpenseStack.titleSuffix') }}
            </h3>
        </template>
        <template #content>
            <div id="monthlyExpenseStackChart" class="relative h-[16rem] w-full">
                <CommonChart
                    type="bar"
                    :data="chartData"
                    :options="chartOptions"
                    :key="theme"
                />
            </div>
        </template>
    </Card>
</template>