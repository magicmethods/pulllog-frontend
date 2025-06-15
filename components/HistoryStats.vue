<script setup lang="ts">
import { useAppStore } from '~/stores/useAppStore'
import { useStatsStore } from '~/stores/useStatsStore'
import { getCurrencyData } from '~/utils/currency'

// Props & Emits
const props = defineProps<{
    appId?: string
    label?: string
}>()

// Stores
const appStore = useAppStore()
const statsStore = useStatsStore()

// Refs & Local variables
const internalAppId = ref<string | null>(props.appId ?? appStore.app?.appId ?? null)
const isLoading = computed<boolean>(() => statsStore.isLoading)
const error = computed<string | null>(() => statsStore.error)
const displayLabel = computed<string>(() => {
    return props.label ?? `${appStore.app?.name ?? '対象アプリケーション'}の履歴統計`
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

</script>

<template>
    <div class="history-stats">
        <h2 v-if="label !== ''" class="stats-title">{{ displayLabel }}</h2>
        <div
            id="statsContainer"
            class="stats-container"
            :class="{ 'bg-transparent gap-8': statsData, 'bg-surface-100 dark:bg-gray-800/40': !statsData }"
        >
            <span v-if="isLoading" class="text-surface-400/60 dark:text-gray-500/60 text-antialiasing select-none">ロード中...</span>
            <!-- span v-else-if="error" class="text-rose-500 dark:text-rose-600 text-antialiasing">{{ error }}</span -->
            <template v-else-if="statsData">
                <!-- ドーナッツチャート（レア排出率） -->
                <ChartRarePullsRate
                    :data="statsData"
                    :key="reloadStatsChartKey"
                />
                <div class="flex items-center justify-center gap-6">
                    <div class="grid grid-cols-1 gap-y-2">
                        <div>
                            <div class="text-xs text-gray-400">集計期間</div>
                            <div class="flex items-baseline gap-1">
                                <span class="font-semibold text-base">{{ statsData.startDate }}</span>
                                <span class="font-normal text-sm text-muted">～</span>
                                <span class="font-semibold text-base">{{ statsData.endDate }}</span>
                            </div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400">履歴登録日数（集計月数）</div>
                            <div class="flex items-baseline gap-1">
                                <span class="font-semibold text-lg">{{ statsData.totalLogs }}</span>
                                <span class="font-normal text-sm text-muted">日</span>
                                <div class="inline-flex items-baseline">
                                    <span class="font-normal text-base">（</span>
                                    <span class="font-semibold text-base">{{ statsData.monthsInPeriod }}</span>
                                    <span class="font-normal text-sm text-muted">ヶ月</span>
                                    <span class="font-normal text-base">）</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-x-4 gap-y-2">
                        <div>
                            <div class="text-xs text-gray-400">総ガチャ回数</div>
                            <div class="font-semibold text-lg">{{ statsData.totalPulls.toLocaleString() }}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400">総課金額</div>
                            <div class="flex items-baseline gap-1">
                                <span class="font-normal text-sm text-muted">{{ currencyUnit }}</span>
                                <span class="font-semibold text-lg">{{ statsData.totalExpense.toLocaleString() }}</span>
                            </div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400">レア排出総数</div>
                            <div class="font-semibold text-lg">{{ statsData.rareDropCount.toLocaleString() }}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400">レア排出率</div>
                            <div class="flex items-baseline gap-1">
                                <span class="font-semibold text-lg">{{ statsData.rareDropRate.toFixed(2) }}</span>
                                <span class="font-normal text-sm text-muted">%</span>
                            </div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400">平均月次課金額</div>
                            <div class="flex items-baseline gap-1">
                                <span class="font-normal text-sm text-muted">{{ currencyUnit }}</span>
                                <span class="font-semibold text-lg">{{ statsData.averageMonthlyExpense?.toLocaleString() }}</span>
                            </div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400">平均ガチャ数/レア</div>
                            <div class="font-semibold text-lg">{{ statsData.averageRareDropRate.toFixed(2) }}</div>
                        </div>
                    </div>
                </div>
            </template>
            <span v-else class="text-surface-400/60 dark:text-gray-500/60 text-antialiasing select-none">データがありません</span>
        </div>
    </div>
</template>
