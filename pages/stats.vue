<script setup lang="ts">
import type { Component } from "vue"
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
// Components
import ChartAppPullStats from "~/components/chart/AppPullStats.vue"
import ChartCumulativeRareRate from "~/components/chart/CumulativeRareRate.vue"
import ChartExpenseRatio from "~/components/chart/ExpenseRatio.vue"
import ChartMonthlyExpenseStack from "~/components/chart/MonthlyExpenseStack.vue"
import ChartRareDropBreakdownRatio from "~/components/chart/RareDropBreakdownRatio.vue"
import ChartRareDropRanking from "~/components/chart/RareDropRanking.vue"
import { useBreakpoint } from "~/composables/useBreakpoint"
import { useStats } from "~/composables/useStats"
import { useStatsLayoutSizing } from "~/composables/useStatsLayoutSizing"
import { useAppStore } from "~/stores/useAppStore"
import { useLoaderStore } from "~/stores/useLoaderStore"
import { useLogStore } from "~/stores/useLogStore"
import { useOptionStore } from "~/stores/useOptionStore"
import { useStatsLayoutStore } from "~/stores/useStatsLayoutStore"
import { useUserStore } from "~/stores/useUserStore"
import { formatDate } from "~/utils/date"

definePageMeta({ requiresCurrency: true })

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
const loaderStore = useLoaderStore()
const optionStore = useOptionStore()
const layoutStore = useStatsLayoutStore()
const { t } = useI18n()

// Composables
const statsData = useStats()
const { isMd, isLg } = useBreakpoint()

// Refs & Local state
const stats = ref<StatsPageData>(null)
const userApps = computed<AppData[]>(() => appStore.appList) // ユーザーが登録しているアプリのリスト
const selectedApps = ref<AppData[]>([]) // 選択されたアプリのリスト
const period = ref<"all" | "range">("all")
const startDate = ref<CalenderDate>(null)
const endDate = ref<CalenderDate>(null)
const maxSelection = computed(() => userStore.planLimits?.maxApps ?? 5) // 最大選択数=ユーザーの登録最大数
const selectedAppId = computed<string>(() =>
    selectedApps.value.length > 0 ? selectedApps.value[0].appId : "",
)
const selectedAppsLabel = computed(() => {
    const isSelectedMax =
        userApps.value.length <= maxSelection.value
            ? selectedApps.value.length === userApps.value.length
            : selectedApps.value.length === maxSelection.value
    return isSelectedMax
        ? selectedApps.value.length === userApps.value.length
            ? t("stats.allAppsSelected")
            : t("stats.maxSelectionReached")
        : t("stats.appsSelected", { count: selectedApps.value.length })
})
const isReadyCondition = computed(() => {
    // 選択アプリがあり、期間が指定されている場合に更新ボタンを有効化
    return (
        selectedApps.value.length > 0 &&
        (period.value === "all" || (startDate.value && endDate.value))
    )
})
const layoutKey = ref<number>(0) // リサイズ対応：再マウント用キー
let resizeTimer: number | undefined
// 動的解決マップ（文字列ではなくコンポーネント参照を使う）
const tileComponentMap: Record<StatsTileId, Component> = {
    "expense-ratio": ChartExpenseRatio,
    "monthly-expense": ChartMonthlyExpenseStack,
    "cumulative-rare-rate": ChartCumulativeRareRate,
    "app-pull-stats": ChartAppPullStats,
    "rare-breakdown": ChartRareDropBreakdownRatio,
    "rare-ranking": ChartRareDropRanking,
}

function bumpLayoutKey() {
    layoutKey.value = layoutKey.value + 1
}

function onWindowResize() {
    if (resizeTimer !== undefined) {
        window.clearTimeout(resizeTimer)
    }
    resizeTimer = window.setTimeout(() => {
        bumpLayoutKey()
    }, 200)
}

async function initialize() {
    if (appStore.appList.length === 0) {
        await appStore.loadApps()
    }
    if (appStore.app) {
        selectedApps.value = [appStore.app]
    }
}

function clearSelectedApps() {
    selectedApps.value = []
}

function selectTileSize(id: StatsTileId, size: StatsTileSize): void {
    layoutStore.setSize(id, size)
}

function toggleTileVisibility(id: StatsTileId): void {
    const target = layoutStore.tiles.find((tile) => tile.id === id)
    if (!target) return
    layoutStore.setVisible(id, !target.visible)
}

function openSettingsModal(): void {
    isSettingsModalVisible.value = true
}

function collectTileIds(container: HTMLElement): StatsTileId[] {
    return Array.from(container.querySelectorAll<HTMLElement>("[data-tile-id]"))
        .map((element) => element.dataset.tileId)
        .filter((id): id is string => typeof id === "string")
        .map((id) => id as StatsTileId)
}

function initGridSortable(): void {
    if (!gridRef.value || !isMd.value) return
    destroyGridSortable()
    gridSortable = nuxtApp.$sortable.create(gridRef.value, {
        dataIdAttr: "data-tile-id",
        onEnd: () => {
            if (!gridRef.value) return
            const ids = collectTileIds(gridRef.value)
            layoutStore.setOrder(ids)
        },
    })
}

function destroyGridSortable(): void {
    gridSortable?.destroy()
    gridSortable = null
}

function toggleDragMode(): void {
    if (!isMd.value) return
    isDragMode.value = !isDragMode.value
    if (isDragMode.value) {
        nextTick(() => initGridSortable())
    } else {
        destroyGridSortable()
    }
}

function getTileSpanClass(tile: StatsTileConfig): string {
    if (!isMd.value) return "span-6"
    if (!isLg.value) {
        return clampSizeForViewport(tile.size, viewportFlags.value)
    }
    return tile.size
}

async function handleAggregation() {
    if (!isReadyCondition.value) return

    const targetApps = selectedApps.value.map((app) => app.appId)
    const useRange = period.value === "range"
    const start =
        useRange && startDate.value ? formatDate(startDate.value) : undefined
    const end =
        useRange && endDate.value ? formatDate(endDate.value) : undefined

    const statsElement = document.getElementById("stats-content") ?? null
    const loaderId = loaderStore.show(t("stats.aggregating"), statsElement)

    try {
        const logStore = useLogStore()
        await Promise.all(
            targetApps.map((appId) =>
                logStore.fetchLogs(appId, {}, undefined, false),
            ),
        )

        const filteredLogs: Record<string, DateLog[]> = {}
        let logCount = 0
        for (const appId of targetApps) {
            const allLogs = Array.from(logStore.logs.get(appId)?.values() ?? [])
            filteredLogs[appId] = allLogs.filter((log) => {
                if (useRange) {
                    if (start && log.date < start) return false
                    if (end && log.date > end) return false
                }
                return true
            })
            logCount += filteredLogs[appId].length
        }
        if (logCount === 0) {
            stats.value = null
            return
        }

        const expenseRatio = statsData.getExpenseRatioPie(
            filteredLogs,
            selectedApps.value,
        )
        const monthlyExpenseStack = statsData.getMonthlyExpenseStack(
            filteredLogs,
            selectedApps.value,
        )
        const cumulativeRareRate = statsData.getMultiCumulativeRareRate(
            targetApps.map((appId) => ({
                appId,
                logs: filteredLogs[appId],
            })),
            start,
            end,
        )
        const cumulativeRareRateMaxValue = statsData.calcMaxRareRate(
            cumulativeRareRate,
            2,
        )
        const appPullStats = statsData.getAppPullStats(
            filteredLogs,
            selectedApps.value,
        )
        const appRareDropBreakdown = statsData.getAppRareDropRates(
            filteredLogs,
            selectedApps.value,
        )
        const appRareDrops = statsData.getAppRareDrops(
            filteredLogs,
            selectedApps.value,
        )

        stats.value = null
        await nextTick()
        stats.value = {
            filteredLogs: { ...filteredLogs },
            expenseRatio: [...expenseRatio],
            monthlyExpenseStack: [...monthlyExpenseStack],
            cumulativeRareRate: JSON.parse(JSON.stringify(cumulativeRareRate)),
            cumulativeRareRateMaxValue,
            appPullStats: [...appPullStats],
            appRareDropBreakdown: [...appRareDropBreakdown],
            appRareDrops: [...appRareDrops],
        }
        bumpLayoutKey()
    } catch (error) {
        stats.value = null
        console.error("Aggregation Error:", error)
    } finally {
        loaderStore.hide(loaderId)
    }
}

function handleAdvancedSettingsApply(nextTiles: StatsTileConfig[]): void {
    const order = nextTiles.map((tile) => tile.id)
    layoutStore.setOrder(order)
    for (const tile of nextTiles) {
        layoutStore.setSize(tile.id, tile.size)
        layoutStore.setVisible(tile.id, tile.visible)
    }
}

onMounted(async () => {
    await layoutStore.initialize(userStore.user?.id ?? null)
    await initialize()
    window.addEventListener("resize", onWindowResize, { passive: true })
})

onBeforeUnmount(() => {
    window.removeEventListener("resize", onWindowResize)
    destroyGridSortable()
    if (resizeTimer !== undefined) {
        window.clearTimeout(resizeTimer)
    }
})

// Layout controls state
const nuxtApp = useNuxtApp()
const { getSizeOptions, clampSizeForViewport } = useStatsLayoutSizing()

const viewportFlags = computed(() => ({
    isMd: isMd.value,
    isLg: isLg.value,
}))

const availableSizes = computed<StatsTileSize[]>(() => [
    ...getSizeOptions(viewportFlags.value),
])
const isSizeControlDisabled = computed(() => !isMd.value)

const tileLabels = computed<Record<StatsTileId, string>>(() => ({
    "expense-ratio": t("stats.layout.tiles.expenseRatio"),
    "monthly-expense": t("stats.layout.tiles.monthlyExpense"),
    "cumulative-rare-rate": t("stats.layout.tiles.cumulativeRareRate"),
    "app-pull-stats": t("stats.layout.tiles.appPullStats"),
    "rare-breakdown": t("stats.layout.tiles.rareBreakdown"),
    "rare-ranking": t("stats.layout.tiles.rareRanking"),
}))

function displaySizeForTile(tile: StatsTileConfig): StatsTileSize {
    return clampSizeForViewport(tile.size, viewportFlags.value)
}

const gridRef = ref<HTMLElement | null>(null)
const isDragMode = ref<boolean>(false)
const isSettingsModalVisible = ref<boolean>(false)

let gridSortable: ReturnType<typeof nuxtApp.$sortable.create> | null = null

// Watchers

//  Layout changes
watch(
    () =>
        layoutStore.tiles.map((tile) => ({
            id: tile.id,
            size: tile.size,
            visible: tile.visible,
        })),
    (nextSnapshots, prevSnapshots) => {
        let shouldRemount =
            !prevSnapshots || nextSnapshots.length !== prevSnapshots.length

        if (!shouldRemount && prevSnapshots) {
            const prevById = new Map(
                prevSnapshots.map((snapshot) => [snapshot.id, snapshot]),
            )
            for (const snapshot of nextSnapshots) {
                const prevSnapshot = prevById.get(snapshot.id)
                if (!prevSnapshot) {
                    shouldRemount = true
                    break
                }
                if (
                    prevSnapshot.size !== snapshot.size ||
                    prevSnapshot.visible !== snapshot.visible
                ) {
                    shouldRemount = true
                    break
                }
            }
        }

        if (shouldRemount) {
            bumpLayoutKey()
        }

        if (isDragMode.value) {
            nextTick(() => initGridSortable())
        }
    },
)

watch(
    () => userStore.user?.id ?? null,
    (nextUserId) => {
        void layoutStore.initialize(nextUserId)
    },
)

watch(
    () => isMd.value,
    (matchesMd) => {
        if (!matchesMd) {
            if (isDragMode.value) {
                isDragMode.value = false
            }
            destroyGridSortable()
        }
    },
)

watch(
    () => appStore.appList,
    () => {
        if (appStore.appList.length === 0) {
            clearSelectedApps() // アプリがない場合、選択アプリリストをクリア
        }
    },
    { deep: true },
)
watch(
    () => userApps.value,
    (list) => {
        if (list.length === 0) {
            clearSelectedApps()
            return
        }
        const byId = new Map(list.map((a) => [a.appId, a]))
        // 既存選択を新しい参照に差し替え（見つからないものは除外）
        selectedApps.value = selectedApps.value
            .map((a) => byId.get(a.appId))
            .filter((a): a is AppData => !!a)
    },
    { deep: true },
)

// PassThrough
const clearButtonPT = {
    root: "h-6 w-6 p-0 rounded-full text-surface-400 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-500 hover:bg-surface-100 dark:hover:bg-gray-800",
    icon: "p-0",
}

// Ad Setting
const adConfig: Record<string, AdProps> = {
    default: {
        adType: "none",
        //adHeight: 90,
    },
    bottom: {
        adType: "none",
        //adHeight: 90,
    },
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
        <div id="stats-controller" class="w-full flex flex-wrap lg:flex-nowrap justify-start items-center gap-4">
            <MultiSelect
                v-model="selectedApps"
                :options="userApps"
                dataKey="appId"
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
                class="w-full flex-grow lg:w-max lg:max-w-1/3"
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
            <div class="w-full md:w-1/2 lg:w-max flex-grow lg:flex-grow-0 flex items-center gap-4">
                <label class="font-semibold mb-0">{{ t('stats.aggregationPeriod') }}</label>
                <div class="flex flex-nowrap items-center gap-6">
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
            <div class="w-full md:w-max flex-grow lg:flex-grow-0 flex items-center gap-2">
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
                    icon="pi pi-sliders-h"
                    class="btn btn-alt flex-1 w-full md:w-max max-w-1/2 md:max-w-1/2 px-4 py-2 text-base! m-0!"
                    @click="openSettingsModal"
                    :disabled="layoutStore.tiles.length === 0"
                />
            </div>
        </div>

        <!-- 統計データ表示欄 -->
        <div v-if="!stats" class="w-full mt-4 flex flex-grow min-h-full justify-center items-center">
            <span class="text-center text-muted">{{ t('stats.noAggregationResults') }}</span>
        </div>
        <div v-else id="stats-content" ref="gridRef" class="w-full mt-4 charts-grid">
            <!-- 通常タイル -->
            <template
                v-for="tile in layoutStore.tiles.filter((t) => !['rare-breakdown', 'rare-ranking'].includes(t.id)) as StatsTileConfig[]"
                :key="`${tile.id}-${layoutKey}`"
            >
                <section
                    v-if="tile.visible"
                    :data-tile-id="tile.id"
                    :class="['chart-tile', getTileSpanClass(tile), { 'chart-tile--drag': isDragMode }]"
                >
                    <component
                        :is="tileComponentMap[tile.id]"
                        v-bind="(() => {
                            if (tile.id === 'expense-ratio') return {
                                data: stats?.expenseRatio ?? []
                            }
                            if (tile.id === 'monthly-expense') return {
                                data: stats?.monthlyExpenseStack ?? []
                            }
                            if (tile.id === 'cumulative-rare-rate') return {
                                data: stats?.cumulativeRareRate ?? [],
                                maxRate: stats?.cumulativeRareRateMaxValue
                            }
                            if (tile.id === 'app-pull-stats') return {
                                data: stats?.appPullStats ?? []
                            }
                            return {}
                        })()"
                    >
                        <template #titleControls>
                            <DisplayControllerUI
                                :size-options="availableSizes"
                                :selected-size="displaySizeForTile(tile)"
                                :disable-size="isSizeControlDisabled"
                                :is-visible="tile.visible"
                                :is-drag-mode="isDragMode"
                                :disable-drag="!isMd"
                                :show-drag-control="isMd"
                                @select-size="(size) => selectTileSize(tile.id, size)"
                                @toggle-visibility="toggleTileVisibility(tile.id)"
                                @toggle-drag="toggleDragMode"
                            />
                        </template>
                    </component>
                </section>
            </template>
            <!-- 1アプリ選択時用タイル -->
            <template
                v-for="tile in layoutStore.tiles.filter((t) => ['rare-breakdown', 'rare-ranking'].includes(t.id)) as StatsTileConfig[]"
                :key="`${tile.id}-${layoutKey}`"
            >
                <section
                    v-if="tile.visible && selectedApps.length === 1"
                    :data-tile-id="tile.id"
                    :class="['chart-tile', getTileSpanClass(tile), { 'chart-tile--drag': isDragMode }]"
                >
                    <component
                        :is="tileComponentMap[tile.id]"
                        v-bind="(() => {
                            if (tile.id === 'rare-breakdown') return {
                                data: stats?.appRareDropBreakdown,
                                appId: selectedAppId
                            }
                            if (tile.id === 'rare-ranking') return {
                                data: stats?.appRareDrops,
                                appId: selectedAppId
                            }
                            return {}
                        })()"
                    >
                        <template #titleControls>
                            <DisplayControllerUI
                                :size-options="availableSizes"
                                :selected-size="displaySizeForTile(tile)"
                                :disable-size="isSizeControlDisabled"
                                :is-visible="tile.visible"
                                :is-drag-mode="isDragMode"
                                :disable-drag="!isMd"
                                :show-drag-control="isMd"
                                @select-size="(size) => selectTileSize(tile.id, size)"
                                @toggle-visibility="toggleTileVisibility(tile.id)"
                                @toggle-drag="toggleDragMode"
                            />
                        </template>
                    </component>
                </section>
            </template>
        </div>

        <AdvancedSettingsModal
            v-model:visible="isSettingsModalVisible"
            :tiles="layoutStore.tiles"
            :tile-labels="tileLabels"
            :size-options="availableSizes"
            :disable-size="isSizeControlDisabled"
            @apply="handleAdvancedSettingsApply"
        />
        <div class="mt-auto pb-2 w-full min-h-max h-[90px]">
            <CommonEmbedAd v-bind="adConfig.bottom" />
        </div>
    </div>
</template>

