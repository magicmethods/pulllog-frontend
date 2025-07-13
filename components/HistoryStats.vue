<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useUserStore } from '~/stores/useUserStore'
import { useAppStore } from '~/stores/useAppStore'
import { useStatsStore } from '~/stores/useStatsStore'
import { useOptionStore } from '~/stores/useOptionStore'
import { getCurrencyData } from '~/utils/currency'

// Props & Emits
const props = defineProps<{
    appId?: string
    label?: string
}>()

// Stores etc.
const userStore = useUserStore()
const appStore = useAppStore()
const statsStore = useStatsStore()
const optionStore = useOptionStore()
const { t } = useI18n()

// Refs & Local variables
const internalAppId = ref<string | null>(props.appId ?? appStore.app?.appId ?? null)
const isLoading = computed<boolean>(() => statsStore.isLoading)
const error = computed<string | null>(() => statsStore.error)
const displayLabel = computed<string>(() => {
    if (props.label && props.label !== '') {
        return props.label
    }
    const appName = appStore.app?.name ?? t('history.historyStats.targetApp')
    return t('history.historyStats.label', { appName })
})
const statsData = ref<StatsData | null>(null)
const currencyUnit = computed<string>(() => {
    return getCurrencyData(appStore.app?.currency_unit ?? 'JPY')?.symbol_native ?? '¥'
})
const reloadStatsChartKey = ref<number>(0)

// Methods
async function fetchStats() {
    if (!internalAppId.value) {
        statsData.value = null
        return
    }
    const targetElement = document.getElementById('statsContainer') ?? undefined
    const data = await statsStore.fetchStats(internalAppId.value, '', '', targetElement)
    console.log('HistoryStats::fetchStats:', data, targetElement)
    statsData.value = data ? {...data} : null
}

// Watchers
watch(
    // 依存propsが変わったら取得
    internalAppId,
    () => { fetchStats() },
    { immediate: true }
)
watch(
    // テーマ変更時にチャートを再描画
    () => userStore.user?.theme,
    () => { reloadStatsChartKey.value++ }
)

</script>

<template>
    <div class="history-stats">
        <h2 v-if="label !== ''" class="stats-title">{{ displayLabel }}</h2>
        <div
            id="statsContainer"
            class="stats-container justify-between! h-28! overflow-x-scroll md:overflow-x-auto overflow-y-hidden"
            :class="{ 'bg-transparent gap-8': statsData, 'bg-surface-100 dark:bg-gray-800/40': !statsData }"
        >
            <span v-if="isLoading" class="text-surface-400/60 dark:text-gray-500/60 text-antialiasing select-none">
                {{ t('history.historyStats.loading') }}</span>
            <!-- span v-else-if="error" class="text-rose-500 dark:text-rose-600 text-antialiasing">{{ error }}</span -->
            <div v-else-if="statsData" class="flex justify-between items-center gap-4 md:gap-6 min-w-max">
                <!-- ドーナッツチャート（レア排出率） -->
                <ChartRarePullsRate
                    :data="statsData"
                    :key="reloadStatsChartKey"
                />
                <div class="flex items-center justify-start gap-6">
                    <div class="grid grid-cols-1 gap-y-2">
                        <div>
                            <div class="text-xs text-gray-400">{{ t('history.historyStats.period') }}</div>
                            <div class="flex items-baseline gap-1">
                                <span class="font-semibold text-base">{{ statsData.startDate }}</span>
                                <span class="font-normal text-sm text-muted">{{ optionStore.rangeSeparator }}</span>
                                <span class="font-semibold text-base">{{ statsData.endDate }}</span>
                            </div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400">{{ t('history.historyStats.registeredDays') }}</div>
                            <div class="flex items-baseline gap-1">
                                <span class="font-semibold text-lg">{{ statsData.totalLogs }}</span>
                                <span class="font-normal text-sm text-muted">{{ t('history.historyStats.days') }}</span>
                                <div class="inline-flex items-baseline">
                                    <span class="font-normal text-base">（</span>
                                    <span class="font-semibold text-base">{{ statsData.monthsInPeriod }}</span>
                                    <span class="font-normal text-sm text-muted">{{ t('history.historyStats.months') }}</span>
                                    <span class="font-normal text-base">）</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-x-4 gap-y-2">
                        <div>
                            <div class="text-xs text-gray-400">{{ t('history.historyStats.totalPulls') }}</div>
                            <div class="font-semibold text-lg">{{ statsData.totalPulls.toLocaleString() }}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400">{{ t('history.historyStats.totalExpense') }}</div>
                            <div class="flex items-baseline gap-1">
                                <span class="font-normal text-sm text-muted">{{ currencyUnit }}</span>
                                <span class="font-semibold text-lg">{{ statsData.totalExpense.toLocaleString() }}</span>
                            </div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400">{{ t('history.historyStats.rareDropCount') }}</div>
                            <div class="font-semibold text-lg">{{ statsData.rareDropCount.toLocaleString() }}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400">{{ t('history.historyStats.rareDropRate') }}</div>
                            <div class="flex items-baseline gap-1">
                                <span class="font-semibold text-lg">{{ statsData.rareDropRate.toFixed(2) }}</span>
                                <span class="font-normal text-sm text-muted">{{ t('history.historyStats.percent') }}</span>
                            </div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400">{{ t('history.historyStats.averageMonthlyExpense') }}</div>
                            <div class="flex items-baseline gap-1">
                                <span class="font-normal text-sm text-muted">{{ currencyUnit }}</span>
                                <span class="font-semibold text-lg">{{ statsData.averageMonthlyExpense?.toLocaleString() }}</span>
                            </div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400">{{ t('history.historyStats.averageRareDropRate') }}</div>
                            <div class="font-semibold text-lg">{{ statsData.averageRareDropRate.toFixed(2) }}</div>
                        </div>
                    </div>
                </div>
            </div>
            <span v-else class="mx-auto text-surface-400/60 dark:text-gray-500/60 text-antialiasing select-none">
                {{ t('history.historyStats.noData') }}</span>
        </div>
    </div>
</template>
