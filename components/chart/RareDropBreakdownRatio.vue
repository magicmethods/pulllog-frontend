<script setup lang="ts">
//import { useUserStore } from '~/stores/useUserStore'
import { useChartPalette } from '~/composables/useChart'
import { strBytesTruncate } from '~/utils/string'

// Props
const props = defineProps<{
    data: RareDropBreakdown
    appId: string
    colors?: ColorMap // appId: ChartColor
    width?: number
    height?: number
}>()

// Stores
//const userStore = useUserStore()

// Composables
const { theme, palette, presetColors } = useChartPalette()

// Refs & Local State
const labelList = ref<string[]>([
    'ピックアップ',
    'すり抜け',
    '狙い',
    '確定枠',
    'その他'
])
const breakdownData = computed(() => {
    const app = props.data.find(item => item.appId === props.appId)
    if (!app) {
        console.warn(`App with ID ${props.appId} not found in data.`)
        return null
    }
    const total = app.rates.rare || 1 // Avoid division by zero
    const pickup = app.rates.getPickup || 0
    const lose = app.rates.loseEvenOdds || 0
    const target = app.rates.getTarget || 0
    const guaranteed = app.rates.guaranteedPull || 0
    const other = total - (pickup + lose + target + guaranteed)
    return {
        appName: app.appName,
        dispName: strBytesTruncate(app.appName, 7, 80),
        total: total,
        data: {
            pickup: {
                label: labelList.value[0],
                value: pickup,
                rate: Math.round(pickup / total * 100),
            },
            lose: {
                label: labelList.value[1],
                value: lose,
                rate: Math.round(lose / total * 100),
            },
            target: {
                label: labelList.value[2],
                value: target,
                rate: Math.round(target / total * 100),
            },
            guaranteed: {
                label: labelList.value[3],
                value: guaranteed,
                rate: Math.round(guaranteed / total * 100),
            },
            other: {
                label: labelList.value[4],
                value: other,
                rate: Math.round(other / total * 100),
            }
        }
    }
})
// 色マップ
const colorMap = computed<ColorMap>(() => {
    const map: ColorMap = {}
    const preset = presetColors.value
    labelList.value.forEach((label, i) => {
        map[label] = props.colors?.[label] ?? preset[i % preset.length]
    })
    return map
})

const chartData = computed(() => {
    if (!breakdownData.value) {
        return {}
    }
    const data = breakdownData.value.data
    return {
        labels: labelList.value,
        datasets: [{
            label: [
                `${data.pickup.label} ${data.pickup.value.toLocaleString()}`,
                `${data.lose.label} ${data.lose.value.toLocaleString()}`,
                `${data.target.label} ${data.target.value.toLocaleString()}`,
                `${data.guaranteed.label} ${data.guaranteed.value.toLocaleString()}`,
                `${data.other.label} ${data.other.value.toLocaleString()}`
            ],
            data: [
                Math.round(data.pickup.rate),
                Math.round(data.lose.rate),
                Math.round(data.target.rate),
                Math.round(data.guaranteed.rate),
                Math.round(data.other.rate)
            ],
            backgroundColor: labelList.value.map(label => colorMap.value[label].bg),
            hoverBackgroundColor: labelList.value.map(label => colorMap.value[label].hover),
            borderColor: labelList.value.map(label => colorMap.value[label].border),
            borderWidth: 2,
            borderAlign: 'center',
            offset: 1,
            hoverOffset: 2
        }]
    }
})

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
                    const label = ctx[0].label || ''
                    return label !== '' ? `${label}` : ''
                },
                label: (ctx: ContextModel) => {
                    const drops = Number(ctx.dataset.label[ctx.dataIndex].replace(ctx.label, '').trim())
                    return `${ctx.parsed}% (${drops})`
                }
            }
        }
    },
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        animateScale: true,
        animateRotate: true
    }
}))

</script>

<template>
    <Card v-if="breakdownData && Object.keys(breakdownData).length > 0" class="min-h-[20rem] w-full flex-grow">
        <template #title>
            <h3 class="text-base">
                {{ breakdownData.dispName }}の<span class="text-primary-800 dark:text-primary-400 mr-0.5">排出レア</span>内訳
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
                    <div v-for="(val, label) in breakdownData.data" :key="label" class="flex items-center">
                        <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: colorMap[val.label].bg ?? '#ccc' }"></div>
                        <span class="ml-2 w-[8rem] text-sm text-surface-600 dark:text-gray-400 truncate">
                            {{ val.label }}
                        </span>
                        <span class="ml-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                            {{ val.value || 0 }}回 ({{ val.rate }}%)
                        </span>
                    </div>
                </div>
            </div>
        </template>
        <template #footer>
            <div class="text-sm text-gray-500 dark:text-gray-400 mt-4">
                <span class="font-semibold mr-2">レア排出数合計:</span>
                <span class="font-semibold text-primary-600 dark:text-primary-400">{{ breakdownData.total.toLocaleString() }}</span>
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400">
                ※ 内訳はアプリ設定の初期マーカー定義のみ有効です。
            </span>
        </template>
    </Card>
</template>