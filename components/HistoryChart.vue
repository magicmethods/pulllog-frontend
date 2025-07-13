<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { DateTime } from 'luxon'
import { useUserStore } from '~/stores/useUserStore'
import { useAppStore } from '~/stores/useAppStore'
import { useLogStore } from '~/stores/useLogStore'

// Props & Emits
const props = defineProps<{
    appId?: string
    label?: string
    /** 変更可能なチャート範囲の定義 */
    ranges?: RangeOption[] // 未指定時はデフォルト範囲 DEFAULT_RANGES
}>()

// Stores etc.
const userStore = useUserStore()
const appStore = useAppStore()
const logStore = useLogStore()
const { t } = useI18n()

// Refs & Local variables
const DEFAULT_RANGES = computed<RangeOption[]>(() => ([
    { label: t('history.historyChart.month1'),  value: '1m', days: 30 },
    { label: t('history.historyChart.month3'),  value: '3m', days: 91 },
    { label: t('history.historyChart.month6'),  value: '6m', days: 182 },
    { label: t('history.historyChart.month12'), value: '1y', days: 365 }
]))
const internalAppId = computed(() => props.appId ?? appStore.app?.appId ?? null)
const internalRanges = computed(() => props.ranges ?? DEFAULT_RANGES.value)
const chartContainer = ref<HTMLElement | null>(null)
const currentRange = ref<RangeOption>(internalRanges.value[0]) // 初期値は1ヶ月
const chartData = ref<ChartDataPoint[]>([])
const appCurrencyCode = computed(() => appStore.getAppCurrencyCode())
const isChangeable = computed(() => internalRanges.value.length > 1 && internalAppId.value)
const chartReloadKey = ref<number>(0)
const guaranteeCount = computed<number | undefined>(() => {
    const appData = appStore.app
        ? appStore.app
        : internalAppId.value ? appStore.appList?.find(app => app.appId === internalAppId.value) : undefined
    if (!appData) return undefined
    return appData.pity_system && appData.guarantee_count && appData.guarantee_count > 0
        ? appData.guarantee_count
        : undefined
})

// Methods
async function loadChartData() {
    if (!internalAppId.value) {
        chartData.value = []
        return
    }
    // 範囲計算（今日を終点）
    const toDate = DateTime.now().toISODate()
    const fromDate = DateTime.now().minus({ days: currentRange.value.days - 1 }).toISODate()
    // ログデータを取得
    const data = await logStore.fetchLogs(internalAppId.value, { fromDate, toDate })
    // データを整形してチャート用に設定
    chartData.value = data.map(log => ({
        date: log.date,
        total_pulls: log.total_pulls,
        rare_pulls: log.discharge_items,
        expense: log.expense
    }))
    chartReloadKey.value++
    console.log('HistoryChart::loadChartData:', chartData.value)
}
function changeRange(range: string) {
    const found = internalRanges.value.find(r => r.value === range)
    if (found) currentRange.value = found
}

// Watchers
watch(
    // グラフの更新に依存する値の変更を監視
    [internalAppId, () => currentRange.value],
    () => { loadChartData() },
    { immediate: true }
)
watch(
    // テーマ変更時にチャートを再描画
    () => userStore.user?.theme,
    () => { chartReloadKey.value++ }
)

</script>

<template>
    <div class="history-chart">
        <div class="chart-header flex items-center justify-between gap-2 mb-2">
            <h2 v-if="label" class="chart-title">{{ label }}</h2>
            <ButtonGroup
                v-if="internalRanges.length"
                class="border rounded-md -mt-1 p-0 border-surface-300 dark:border-gray-700 overflow-hidden"
            >
                <Button
                    v-for="range in internalRanges"
                    :key="range.value"
                    :label="range.label"
                    size="small"
                    class="py-1 px-2 text-sm border-r last:border-r-0 border-surface-300 dark:border-gray-700 hover:bg-surface-100 dark:hover:bg-gray-800 hover:text-surface-700 dark:hover:text-white"
                    :class="{
                        'bg-primary-500 dark:bg-primary-600 text-white! hover:bg-primary-500! dark:hover:bg-primary-600!': currentRange.value === range.value,
                        'opacity-50 cursor-not-allowed': !isChangeable,
                        'hidden md:block': '1y' === range.value,
                    }"
                    :disabled="!isChangeable"
                    @click="changeRange(range.value)"
                />
            </ButtonGroup>
        </div>
        <div ref="chartContainer" class="chart-container">
            <ChartLatestPullHistory
                v-if="chartData?.length > 0"
                :chartData="chartData"
                :range="currentRange.days"
                :currencyCode="appCurrencyCode"
                :guaranteeCount="guaranteeCount"
                :key="chartReloadKey"
                class="w-full h-64"
            />
            <div v-else class="text-center text-muted text-antialiasing">
                <span v-if="!internalAppId">{{ $t('history.historyChart.selectApp') }}</span>
                <span v-else>{{ $t('history.historyChart.noData') }}</span>
            </div>
        </div>
    </div>
</template>
