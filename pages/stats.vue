<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'
import { useAppStore } from '~/stores/useAppStore'
import { useLogStore } from '~/stores/useLogStore'
import { useLoaderStore } from '~/stores/useLoaderStore'
import { useOptionStore } from '~/stores/useOptionStore'
import { useI18n } from 'vue-i18n'
import { getMaxApps } from '~/utils/user'
import { formatDate } from '~/utils/date'

// Types: in this page only
type StatsPageData = {
    filteredLogs: Record<string, DateLog[]>
    expenseRatio: PieChartData
    monthlyExpenseStack: StackedBarData
    cumulativeRareRate: CumulativeRareRate
    cumulativeRareRateMaxValue: number
    appPullStats: AppPullStats[]
    appRareDropBreakdown: RareDropBreakdown
    appRareDrops: RareDropRanking
} | null

// Stores etc.
const userStore = useUserStore()
const appStore = useAppStore()
const logStore = useLogStore()
const loaderStore = useLoaderStore()
const optionStore = useOptionStore()
const { t } = useI18n()

// Composables
const statsData = useStats()

// Refs & Local state
const stats = ref<StatsPageData>(null)
const userApps = computed<AppData[]>(() => appStore.appList) // ユーザーが登録しているアプリのリスト
const selectedApps = ref<AppData[]>([]) // 選択されたアプリのリスト
const period = ref<'all' | 'range'>('all')
const startDate = ref<CalenderDate>(null)
const endDate = ref<CalenderDate>(null)
const maxSelection = computed(() => getMaxApps(userStore.user)) // 最大選択数=ユーザーの登録最大数
const selectedAppsLabel = computed(() => {
    const isSelectedMax = userApps.value.length <= maxSelection.value
        ? selectedApps.value.length === userApps.value.length
        : selectedApps.value.length === maxSelection.value
    return isSelectedMax
        ? selectedApps.value.length === userApps.value.length ? t('stats.allAppsSelected') : t('stats.maxSelectionReached')
        : t('stats.appsSelected', { count: selectedApps.value.length })
})
const isReadyCondition = computed(() => {
    // 選択アプリがあり、期間が指定されている場合に更新ボタンを有効化
    return selectedApps.value.length > 0 && (period.value === 'all' || (startDate.value && endDate.value))
})

// Methods
async function initialize() {
    // 初期化処理
    if (appStore.appList.length === 0) {
        await appStore.loadApps()
    }
    if (appStore.app) {
        selectedApps.value = [appStore.app] // デフォルトで最初のアプリを選択
    }
}
function clearSelectedApps() {
    selectedApps.value = [] // 選択アプリリストをクリア
}
async function handleAggregation() {
    if (!isReadyCondition.value) return

    // 集計条件を定義
    const targetApps = selectedApps.value.map(app => app.appId)
    const useRange = period.value === 'range'
    const start = useRange && startDate.value ? formatDate(startDate.value) : undefined
    const end = useRange && endDate.value ? formatDate(endDate.value) : undefined

    const statsElement = document.getElementById('stats-content') ?? null
    const loaderId = loaderStore.show(t('stats.aggregating'), statsElement)

    try {
        // 対象アプリの履歴全件取得（並列処理）
        const logStore = useLogStore()
        await Promise.all(
            targetApps.map(appId => logStore.fetchLogs(appId, {}, undefined, false))
        )

        // 期間抽出
        const filteredLogs: Record<string, DateLog[]> = {}
        for (const appId of targetApps) {
            const allLogs = Array.from(logStore.logs.get(appId)?.values() ?? [])
            filteredLogs[appId] = allLogs.filter(log => {
                if (useRange) {
                    if (start && log.date < start) return false
                    if (end && log.date > end) return false
                }
                return true
            })
        }

        // 集計ロジック（統計・グラフ用データ生成）
        // 複数アプリ合計課金額に占める各アプリの割合（Pieチャート用）
        const expenseRatio = statsData.getExpenseRatioPie(filteredLogs, selectedApps.value)
        // 全指定アプリの月次合計課金額（積み上げ棒グラフ用）
        const monthlyExpenseStack = statsData.getMonthlyExpenseStack(filteredLogs, selectedApps.value)
        // 日次/月次累計レアドロップ率推移（折れ線グラフ用）
        const cumulativeRareRate = statsData.getMultiCumulativeRareRate(targetApps.map(appId => ({
            appId,
            logs: filteredLogs[appId]
        })), start, end)
        const cumulativeRareRateMaxValue = statsData.calcMaxRareRate(cumulativeRareRate, 2)
        // アプリごとの引き当て数・レアドロップ数・レア率を集計しランキング（横型棒グラフ）
        const appPullStats = statsData.getAppPullStats(filteredLogs, selectedApps.value)
        // アプリごとのレアドロップ内訳を集計（Pieチャート用）
        const appRareDropBreakdown = statsData.getAppRareDropRates(filteredLogs, selectedApps.value)
        // アプリごとのレアドロップランキング
        const appRareDrops = statsData.getAppRareDrops(filteredLogs, selectedApps.value)

        // stats.valueに集計結果をセットし、表示更新
        stats.value = null
        await nextTick()
        stats.value = {
            filteredLogs: { ...filteredLogs },
            expenseRatio: [...expenseRatio],
            monthlyExpenseStack: [...monthlyExpenseStack],
            cumulativeRareRate: JSON.parse(JSON.stringify(cumulativeRareRate)), // JSON.stringify/parseで参照をクリア
            cumulativeRareRateMaxValue,
            appPullStats: [...appPullStats],
            appRareDropBreakdown: [...appRareDropBreakdown], //JSON.parse(JSON.stringify(appRareDropBreakdown)), // JSON.stringify/parseで参照をクリア
            appRareDrops: [...appRareDrops],
        }
        //console.log('Aggregation Results:', stats.value)
    } catch (e: unknown) {
        // エラーハンドリング
        console.error('Aggregation Error:', e)
        stats.value = null // エラー時は集計結果をクリア
    } finally {
        loaderStore.hide(loaderId) // ローダーを非表示
    }
}

// Lifecycle Hooks
onMounted(() => {
    initialize()
})

// Watchers
watch(
    () => appStore.appList,
    () => {
        if (appStore.appList.length === 0) {
            clearSelectedApps() // アプリがない場合、選択アプリリストをクリア
        }
    },
    { deep: true }
)

const clearButtonPT = {
    root: 'h-6 w-6 p-0 rounded-full text-surface-400 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-500 hover:bg-surface-100 dark:hover:bg-gray-800',
    icon: 'p-0',
}

// Ad Setting
const adConfig: Record<string, AdProps> = {
    default: {
        adItems: [
            { image: '/sample/ad_9.png',  link: 'https://example.com/?ad=9',  alt: 'リーダーボード広告 (728x90)' },
            { image: '/sample/ad_10.png', link: 'https://example.com/?ad=10', alt: 'リーダーボード広告 (728x90)' },
            { image: '/sample/ad_11.png', link: 'https://example.com/?ad=11', alt: 'リーダーボード広告 (728x90)' },
        ],
        adType: 'slot',
        adClient: 'ca-pub-8602791446931111',
        adSlotName: '8956575261',
    },
    bottom: {
        adItems: [
            { image: '/sample/ad_9.png',  link: 'https://example.com/?ad=9',  alt: 'リーダーボード広告 (728x90)' },
            { image: '/sample/ad_10.png', link: 'https://example.com/?ad=10', alt: 'リーダーボード広告 (728x90)' },
            { image: '/sample/ad_11.png', link: 'https://example.com/?ad=11', alt: 'リーダーボード広告 (728x90)' },
        ],
        adType: 'slot',
        adClient: 'ca-pub-8602791446931111',
        adSlotName: '5664134061',
    }
}

</script>

<template>
    <div class="w-full h-max p-4 flex flex-col justify-between">
        <Head>
            <Title>{{ `${t('stats.header')} | ${t('app.name')}` }}</Title>
        </Head>
        <CommonPageHeader
            :title="t('stats.header')"
            :adProps="adConfig.default"
        />
        <!-- Page Content -->
        <div id="stats-controller" class="w-full flex flex-wrap md:flex-nowrap justify-start items-center gap-4">
            <MultiSelect
                v-model="selectedApps"
                :options="userApps"
                display="chip"
                optionLabel="name"
                :placeholder="t('stats.targetApps')"
                :filter="false"
                :showToggleAll="true"
                :showClear="true"
                :selectedItemsLabel="selectedAppsLabel"
                :maxSelectedLabels="3"
                :selectionLimit="maxSelection"
                :emptyMessage="t('stats.noRegisteredApps')"
            >
                <template #clearicon>
                    <div class="relative -right-1 flex justify-end items-center self-end">
                        <Button
                            icon="pi pi-times"
                            :pt="clearButtonPT"
                            @click.stop="clearSelectedApps"
                        />
                    </div>
                </template>
            </MultiSelect>
            <div class="flex items-center gap-4">
                <label class="font-semibold mb-0">{{ t('stats.aggregationPeriod') }}</label>
                <div class="flex flex-wrap items-center gap-6">
                    <div class="flex items-center gap-2">
                        <RadioButton v-model="period" inputId="mode-all" name="mode" value="all" />
                        <label for="mode-all" class="font-medium mb-0">{{ t('stats.allPeriod') }}</label>
                    </div>
                    <div class="flex items-center gap-2">
                        <RadioButton v-model="period" inputId="mode-range" name="mode" value="range" />
                        <label for="mode-range" class="font-medium mb-0">{{ t('stats.specifyDate') }}</label>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <CalendarUI
                    v-model="startDate"
                    :placeholder="t('stats.startDate')"
                    :maxDate="endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) as Date : undefined"
                    :pt="{ root: 'flex-grow w-max md:w-max', panel: 'w-[calc(100%_-_20px)] md:w-80' }"
                    containerClass="w-40"
                    :withFooter="true"
                    :commit="false"
                    :disabled="period !== 'range'"
                />
                <span class="self-center">{{ optionStore.rangeSeparator }}</span>
                <CalendarUI
                    v-model="endDate"
                    :placeholder="t('stats.endDate')"
                    :minDate="startDate ? (typeof startDate === 'string' ? new Date(startDate) : startDate) as Date : undefined"
                    :pt="{ root: 'flex-grow w-max md:w-max', panel: 'w-[calc(100%_-_20px)] md:w-80' }"
                    containerClass="w-40"
                    :withFooter="true"
                    :commit="false"
                    :disabled="period !== 'range'"
                />
            </div>
            <div class="flex-grow flex justify-between items-center gap-4">
                <Button
                    :label="t('stats.startAggregation')"
                    class="btn btn-primary flex-1 w-full md:w-max max-w-1/2 md:max-w-1/2 px-4 py-2 text-base! m-0!"
                    @click="handleAggregation"
                    :disabled="!isReadyCondition"
                />
                <div class="flex-grow"></div>
                <Button
                    :label="t('stats.advancedSettings')"
                    icon="pi pi-lock"
                    class="btn btn-alt flex-1 w-full md:w-max max-w-1/2 md:max-w-1/2 px-4 py-2 text-base! m-0!"
                    @click=""
                    :disabled="true"
                />
            </div>
        </div>

        <!-- 統計データ表示欄 -->
        <div v-if="!stats" class="w-full mt-4 flex flex-grow min-h-full justify-center items-center">
            <span class="text-center text-muted">{{ t('stats.noAggregationResults') }}</span>
        </div>
        <div v-else id="stats-content" class="w-full mt-4 flex flex-col gap-4">
            <div class="flex flex-wrap justify-between items-center gap-4">
                <ChartExpenseRatio :data="stats.expenseRatio ?? []" />
                <ChartMonthlyExpenseStack :data="stats.monthlyExpenseStack ?? []" />
            </div>
            <div class="flex flex-wrap justify-between items-center gap-4">
                <ChartCumulativeRareRate :data="stats.cumulativeRareRate ?? []" :maxRate="stats.cumulativeRareRateMaxValue" />
                <ChartAppPullStats :data="stats.appPullStats ?? []" />
            </div>
            <div v-if="selectedApps.length === 1" class="flex flex-wrap justify-between items-center gap-4">
                <ChartRareDropBreakdownRatio :data="stats.appRareDropBreakdown" :appId="selectedApps[0].appId ?? ''" />
                <ChartRareDropRanking :data="stats.appRareDrops" :appId="selectedApps[0].appId ?? ''" />
            </div>
        </div>
    </div>
</template>
