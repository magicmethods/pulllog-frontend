<script setup lang="ts">
import { DateTime } from "luxon"
import { useToast } from "primevue/usetoast"
import { useI18n } from "vue-i18n"
// biome-ignore lint/style/useImportType: used as a runtime component in template
import AppStatsImage from "~/components/chart/AppStatsImage.vue"
import type ChartLatestPullHistory from "~/components/chart/LatestPullHistory.vue"
import { useStats } from "~/composables/useStats"
import { useLogStore } from "~/stores/useLogStore"
import { useUserStore } from "~/stores/useUserStore"
import { composeVertical, downloadBlob } from "~/utils/image"

// Props & Emits
const props = defineProps<{
    visible: boolean
    app: AppData
    /** 対象日（YYYY-MM-DD） */
    targetDate: string
}>()
const emit = defineEmits<{
    (e: "update:visible", v: boolean): void
    (e: "close"): void
}>()

// Stores & i18n
const logStore = useLogStore()
const userStore = useUserStore()
const stats = useStats()
const toast = useToast()
const { t } = useI18n()

// State
type RangeAKey = "1d" | "1w" | "2w" | "1m"
type RangeBKey = "1d" | "1w" | "2w" | "1m" | "all"
const rangeA = ref<RangeAKey>("1w")
const rangeB = ref<RangeBKey>("1w")
// 出力対象チェック
const includeA = ref<boolean>(true)
const includeB = ref<boolean>(true)
// 出力幅（小/中/大）
type SizeKey = "s" | "m" | "l"
const size = ref<SizeKey>("s") // 既定: 小=480px
const sizePx = computed(() =>
    size.value === "s" ? 480 : size.value === "m" ? 720 : 960,
)
const loading = ref(false)
const error = ref<string | null>(null)
const isDemoUser = computed(() => userStore.hasUserRole("demo"))

// Derived
const rangeDaysA = computed<number>(() => {
    switch (rangeA.value) {
        case "1d":
            return 1
        case "1w":
            return 7
        case "2w":
            return 14
        default:
            return 30
    }
})
const toDateA = computed(() => props.targetDate)
const fromDateA = computed(() => {
    const end = DateTime.fromISO(props.targetDate).startOf("day")
    const start = end.minus({ days: rangeDaysA.value - 1 })
    return start.toISODate() ?? props.targetDate
})
const toDateB = computed(() => props.targetDate)
const fromDateB = ref<string>(props.targetDate)
// Chart instances
const chartARef = ref<InstanceType<typeof ChartLatestPullHistory> | null>(null)
const chartBRef = ref<InstanceType<typeof AppStatsImage> | null>(null)

// Data
const chartAData = ref<ChartDataPoint[]>([])
const logsB = ref<DateLog[]>([])

// Final composed preview
const previewUrl = ref<string | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
let previewTimer: number | null = null

function revokePreviewUrl() {
    if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
        previewUrl.value = null
    }
}

async function buildComposedPreview() {
    if (!canDownloadNow.value) {
        revokePreviewUrl()
        return
    }
    previewLoading.value = true
    previewError.value = null
    try {
        await nextTick()
        const width = sizePx.value
        const margin = 15
        const innerW = width - margin * 2
        const bg = getThemeBackgroundStrict()
        const images: Blob[] = []
        if (includeA.value) {
            const blobA = await chartARef.value?.toImage(innerW, null)
            if (!blobA) throw new Error("failed to capture chart A")
            images.push(blobA)
        }
        if (includeB.value) {
            const blobB = await chartBRef.value?.toImage(innerW, null)
            if (!blobB) throw new Error("failed to capture chart B")
            images.push(blobB)
        }
        const composed = await composeVertical(images, {
            width,
            margin,
            gap: 15,
            background: bg,
            watermarkText: "© PullLog.net",
            headerText: t("modal.shareImage.imageTitle", {
                appName: props.app.name,
                targetDate: toDateA.value,
            }),
            divider: true,
        })
        const url = URL.createObjectURL(composed)
        revokePreviewUrl()
        previewUrl.value = url
    } catch (e: unknown) {
        previewError.value = e instanceof Error ? e.message : String(e)
        revokePreviewUrl()
    } finally {
        previewLoading.value = false
    }
}

function schedulePreview(delay = 250) {
    if (previewTimer) window.clearTimeout(previewTimer)
    previewTimer = window.setTimeout(() => {
        if (!loading.value) void buildComposedPreview()
    }, delay) as unknown as number
}

// Helpers
function shiftDate(date: string, deltaDays: number): string {
    const dt = DateTime.fromISO(date).startOf("day")
    return dt.plus({ days: deltaDays }).toISODate() ?? date
}

async function loadData() {
    error.value = null
    if (!props.app?.appId || !props.targetDate) return
    loading.value = true
    try {
        // A: 対象期間のログ
        const logsA = await logStore.fetchLogs(props.app.appId, {
            fromDate: fromDateA.value,
            toDate: toDateA.value,
        })
        // A: チャートデータ
        const raw: ChartDataPoint[] = logsA.map((log) => ({
            date: log.date,
            total_pulls: log.total_pulls,
            rare_pulls: log.discharge_items,
            expense: log.expense_decimal ?? 0,
        }))
        // Aは startDate=fromDateA を明示指定して軸末尾=対象日とするため、日付のシフトは不要
        chartAData.value = raw
        // B: ログ（rangeBに応じて）
        if (rangeB.value === "all") {
            const all = await logStore.fetchLogs(props.app.appId)
            const filtered = all.filter((l) => l.date <= toDateB.value)
            logsB.value = filtered
            // 最小日付を開始日に
            const min = filtered.reduce<string | null>(
                (m, l) => (!m || l.date < m ? l.date : m),
                null,
            )
            fromDateB.value = min ?? props.targetDate
        } else {
            const days = rangeDaysA.value // Aと同粒度の換算ヘルパーを流用
            const end = DateTime.fromISO(props.targetDate).startOf("day")
            const start = end.minus({
                days:
                    ((): number => {
                        switch (rangeB.value) {
                            case "1d":
                                return 1
                            case "1w":
                                return 7
                            case "2w":
                                return 14
                            default:
                                return 30
                        }
                    })() - 1,
            })
            const from = start.toISODate() ?? props.targetDate
            const to = end.toISODate() ?? props.targetDate
            fromDateB.value = from
            const lb = await logStore.fetchLogs(props.app.appId, {
                fromDate: from,
                toDate: to,
            })
            logsB.value = lb
        }
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e)
    } finally {
        loading.value = false
    }
}

watch(
    [() => props.app?.appId, () => props.targetDate, rangeA, rangeB],
    () => {
        loadData()
    },
    { immediate: true },
)

function close() {
    emit("update:visible", false)
    emit("close")
}

function isDarkTheme(): boolean {
    const theme = userStore.user?.theme
    if (theme === "dark") return true
    if (theme === "light") return false
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false
}
function getThemeBackgroundStrict(): string {
    return isDarkTheme() ? "#101927" : "#FFFFFF"
}

const hasDataA = computed(() =>
    chartAData.value.some((d) => (Number(d.total_pulls) || 0) > 0),
)
const hasDataB = computed(
    () =>
        logsB.value.length > 0 &&
        logsB.value.some((l) => (l.total_pulls || 0) > 0),
)
const canDownloadNow = computed(() => {
    const selA = includeA.value
    const selB = includeB.value
    if (!selA && !selB) return false
    if (selA && !hasDataA.value) return false
    if (selB && !hasDataB.value) return false
    return true
})
const chartARange = computed(() => {
    return rangeA.value === "1d"
        ? t("modal.shareImage.ranges.today")
        : rangeA.value === "1w"
          ? t("modal.shareImage.ranges.week1")
          : rangeA.value === "2w"
            ? t("modal.shareImage.ranges.week2")
            : t("modal.shareImage.ranges.month1")
})
const chartBRange = computed(() => {
    return `${fromDateB.value} ${t("options.rangeSeparator")} ${toDateB.value}`
})

// レイアウト比率（プレビューと出力を近づける）
const aHeightPx = computed(() => {
    // 小: 0.46 / 中: 0.40 / 大: 0.36（横幅に対する高さの比率）
    if (size.value === "s") return Math.round(sizePx.value * 0.46)
    if (size.value === "m") return Math.round(sizePx.value * 0.4)
    return Math.round(sizePx.value * 0.36)
})
// Bのプレビュー高さはドーナッツ直径+上下パディング（AppStatsImage基準: 140 + 12*2 = 164）
const bHeightPx = computed(() => 164)
const colsB = computed(() =>
    size.value === "s" ? 1 : size.value === "m" ? 2 : 3,
)

// Offscreen rendering root for hidden charts (to keep layout unaffected)
const offscreenRoot = ref<HTMLElement | null>(null)
onMounted(() => {
    const el = document.createElement("div")
    el.setAttribute("data-offscreen-charts", "true")
    el.style.position = "fixed"
    el.style.left = "-10000px"
    el.style.top = "-10000px"
    el.style.pointerEvents = "none"
    el.style.opacity = "0"
    document.body.appendChild(el)
    offscreenRoot.value = el
})
onUnmounted(() => {
    if (offscreenRoot.value?.parentNode) {
        offscreenRoot.value.parentNode.removeChild(offscreenRoot.value)
    }
    revokePreviewUrl()
})

function resetState() {
    includeA.value = true
    includeB.value = true
    rangeA.value = "1w"
    rangeB.value = "1w"
    size.value = "s"
    revokePreviewUrl()
    previewError.value = null
}

watch(
    () => props.visible,
    (v) => {
        if (v) {
            resetState()
            schedulePreview(100)
        } else {
            resetState()
        }
    },
)

async function handleDownload() {
    if (isDemoUser.value) return
    error.value = null
    try {
        if (!canDownloadNow.value) {
            throw new Error(t("app.error.statsNotFound"))
        }
        const width = sizePx.value
        const margin = 15
        const innerW = width - margin * 2
        const bg = getThemeBackgroundStrict()
        const images: Blob[] = []
        if (includeA.value) {
            const blobA = await chartARef.value?.toImage(innerW, null)
            if (!blobA) throw new Error("failed to capture chart A")
            images.push(blobA)
        }
        if (includeB.value) {
            const blobB = await chartBRef.value?.toImage(innerW, null)
            if (!blobB) throw new Error("failed to capture chart B")
            images.push(blobB)
        }
        const composed = await composeVertical(images, {
            width,
            margin,
            gap: 15,
            background: bg,
            watermarkText: "© PullLog.net",
            headerText: t("modal.shareImage.imageTitle", {
                appName: props.app.name,
                targetDate: toDateA.value,
            }),
            divider: true,
        })
        const fileName = `pulllog_${props.app.appId}_${props.targetDate}.png`
        downloadBlob(composed, fileName)
        toast.add({
            severity: "success",
            summary: t("modal.shareImage.downloaded"),
            detail: fileName,
            life: 2500,
            group: "notices",
        })
        close()
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e)
    }
}

// Auto preview when inputs change
watch([includeA, includeB, rangeA, rangeB, size, chartAData, logsB], () => {
    schedulePreview()
})
watch(loading, (v) => {
    if (!v) schedulePreview(50)
})

onUnmounted(() => {
    if (previewTimer) window.clearTimeout(previewTimer)
    revokePreviewUrl()
})
</script>

<template>
    <Dialog
        :visible="visible"
        modal
        :closable="false"
        class="w-[48rem] max-w-[96vw] dark:bg-gray-800"
        @update:visible="$emit('update:visible', $event)"
    >
        <template #header>
            <div class="w-full flex items-center justify-between px-2">
                <h3 class="text-primary-800 dark:text-primary-400 text-lg font-medium">{{ t('modal.shareImage.title') }}</h3>
                <Button icon="pi pi-times" class="h-8 w-8 m-0 p-0 rounded-full hover:bg-surface-200/50 hover:text-primary-500 dark:hover:bg-gray-700/40" @click="close" :aria-label="t('modal.shareImage.dismiss')" />
            </div>
        </template>
        <div class="flex flex-col gap-3 p-2">
            <div class="flex flex-col gap-1">
                <!-- A: チェックボックス -->
                <div class="flex items-center gap-2">
                    <Checkbox v-model="includeA" :binary="true" inputId="chkA" class="w-6" />
                    <label for="chkA" class="text-base">{{ t('modal.shareImage.checkA') }}</label>
                </div>
                <!-- A: 期間ラジオ -->
                <div class="ml-8 pl-0.5 h-max flex justify-start items-center gap-2">
                    <label :class="['block mt-1 text-sm font-bold', { 'text-muted': !includeA }]">{{ t('modal.shareImage.rangeA') }}</label>
                    <div :class="['flex flex-wrap gap-4 items-center', { 'text-muted': !includeA }]">
                        <div class="flex items-center gap-2">
                            <RadioButton inputId="ra-1d" name="rangeA" value="1d" v-model="rangeA" :disabled="!includeA" />
                            <label for="ra-1d" class="text-sm font-semibold my-auto">{{ t('modal.shareImage.ranges.today') }}</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <RadioButton inputId="ra-1w" name="rangeA" value="1w" v-model="rangeA" :disabled="!includeA" />
                            <label for="ra-1w" class="text-sm font-semibold my-auto">{{ t('modal.shareImage.ranges.week1') }}</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <RadioButton inputId="ra-2w" name="rangeA" value="2w" v-model="rangeA" :disabled="!includeA" />
                            <label for="ra-2w" class="text-sm font-semibold my-auto">{{ t('modal.shareImage.ranges.week2') }}</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <RadioButton inputId="ra-1m" name="rangeA" value="1m" v-model="rangeA" :disabled="!includeA" />
                            <label for="ra-1m" class="text-sm font-semibold my-auto">{{ t('modal.shareImage.ranges.month1') }}</label>
                        </div>
                    </div>
                </div>
                <!-- B: チェックボックス -->
                <div class="flex items-center gap-2">
                    <Checkbox v-model="includeB" :binary="true" inputId="chkB" class="w-6" />
                    <label for="chkB" class="text-base">{{ t('modal.shareImage.checkB') }}</label>
                </div>
                <!-- B: 期間ラジオ（全期間あり） -->
                <div class="ml-8 pl-0.5 h-max flex justify-start items-center gap-2">
                    <label :class="['block mb-1 text-sm font-bold', { 'text-muted': !includeB }]">{{ t('modal.shareImage.rangeB') }}</label>
                    <div :class="['flex flex-wrap gap-4 items-center', { 'text-muted': !includeB }]">
                        <div class="flex items-center gap-2">
                            <RadioButton inputId="rb-1d" name="rangeB" value="1d" v-model="rangeB" :disabled="!includeB" />
                            <label for="rb-1d" class="text-sm font-semibold my-auto">{{ t('modal.shareImage.ranges.today') }}</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <RadioButton inputId="rb-1w" name="rangeB" value="1w" v-model="rangeB" :disabled="!includeB" />
                            <label for="rb-1w" class="text-sm font-semibold my-auto">{{ t('modal.shareImage.ranges.week1') }}</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <RadioButton inputId="rb-2w" name="rangeB" value="2w" v-model="rangeB" :disabled="!includeB" />
                            <label for="rb-2w" class="text-sm font-semibold my-auto">{{ t('modal.shareImage.ranges.week2') }}</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <RadioButton inputId="rb-1m" name="rangeB" value="1m" v-model="rangeB" :disabled="!includeB" />
                            <label for="rb-1m" class="text-sm font-semibold my-auto">{{ t('modal.shareImage.ranges.month1') }}</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <RadioButton inputId="rb-all" name="rangeB" value="all" v-model="rangeB" :disabled="!includeB" />
                            <label for="rb-all" class="text-sm font-semibold my-auto">{{ t('modal.shareImage.ranges.all') }}</label>
                        </div>
                    </div>
                </div>
                <!-- 幅指定 -->
                <div class="pl-0.5 h-max flex justify-start items-center gap-2">
                    <label class="block mt-1 text-base font-bold">{{ t('modal.shareImage.size') }}</label>
                    <div :class="['flex flex-wrap gap-4 items-center ml-4', { 'text-muted': !includeA && !includeB }]">
                        <div class="flex items-center gap-2">
                            <RadioButton inputId="sz-s" name="size" value="s" v-model="size" :disabled="!includeA && !includeB" />
                            <label for="sz-s" class="text-sm font-semibold my-auto">{{ t('modal.shareImage.sizes.small') }}</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <RadioButton inputId="sz-m" name="size" value="m" v-model="size" :disabled="!includeA && !includeB" />
                            <label for="sz-m" class="text-sm font-semibold my-auto">{{ t('modal.shareImage.sizes.medium') }}</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <RadioButton inputId="sz-l" name="size" value="l" v-model="size" :disabled="!includeA && !includeB" />
                            <label for="sz-l" class="text-sm font-semibold my-auto">{{ t('modal.shareImage.sizes.large') }}</label>
                        </div>
                    </div>
                </div>

                <Divider align="left" class="pl-4" :pt="{ content: 'px-2 bg-white dark:bg-[#192433]' }">
                    <span class="text-sm font-semibold text-surface-500 dark:text-gray-400">{{ t('modal.shareImage.preview') }} ({{ sizePx }}px)</span>
                </Divider>

                <div
                    :class="[
                        'absolute mx-auto h-max min-h-40 w-max max-w-full overflow-x-auto select-none flex flex-col justify-between',
                        { 'border rounded bg-white dark:bg-gray-900 border-surface-400 dark:border-gray-700 p-4': includeA || includeB },
                        { 'opacity-50': loading },
                    ]"
                    :style="{ top: '-9999px', left: '-9999px', width: `${sizePx}px` }"
                >
                    <h2 v-if="includeA || includeB" class="text-lg font-bold text-surface-600 dark:text-white mb-2">
                        {{ t('modal.shareImage.imageTitle', { appName: props.app.name, targetDate: toDateA }) }}
                    </h2>
                <!-- オフスクリーン描画用（Teleport）のみでプレーンプレビューは非表示 -->
                </div>

                <!-- 最終プレビュー（合成＋WM） -->
                <div class="flex flex-col gap-2">
                    <div class="relative border rounded bg-white dark:bg-[#101927] border-surface-300 dark:border-gray-600 p-2 min-h-28 flex items-center justify-center select-none">
                        <template v-if="!canDownloadNow">
                            <span class="text-sm text-muted">{{ t('modal.shareImage.previewUnavailable') }}</span>
                        </template>
                        <template v-else>
                            <span v-if="previewLoading" class="text-sm text-muted">{{ t('app.loading') }}</span>
                            <span v-else-if="previewError" class="text-sm text-rose-500">{{ previewError }}</span>
                            <img v-else-if="previewUrl" :src="previewUrl" alt="preview" class="max-w-full h-auto select-none" />
                        </template>
                        <Button icon="pi pi-refresh" class="absolute top-2 right-2 p-2 h-8 w-8 !text-surface-500 hover:!text-primary-500" severity="secondary" rounded text @click="buildComposedPreview" :aria-label="t('modal.shareImage.regenerate')" />
                    </div>
                </div>

                <!-- アラート/ボタン -->
                <Message v-if="isDemoUser" severity="warn" size="small">{{ t('app.error.demoDetail') }}</Message>
                <Message v-if="error" severity="error" size="small">{{ error }}</Message>
            </div>
        </div>

        <template #footer>
            <div class="w-full flex items-center justify-between gap-4">
                <Button
                    :label="t('modal.shareImage.cancel')"
                    class="btn btn-alternative w-full"
                    @click="close"
                />
                <Button
                    :label="t('modal.shareImage.commit')"
                    class="btn btn-primary w-full"
                    :disabled="loading || isDemoUser || !canDownloadNow"
                    @click="handleDownload"
                />
            </div>
        </template>
    </Dialog>
    <!-- Offscreen chart render root -->
    <Teleport v-if="offscreenRoot && visible" :to="offscreenRoot">
        <div>
            <div v-if="includeA" :style="{ width: (sizePx - 30) + 'px', height: aHeightPx + 'px' }">
                <ChartLatestPullHistory
                    ref="chartARef"
                    :chartData="chartAData"
                    :range="rangeDaysA"
                    :currencyCode="props.app.currency_code ?? ''"
                    :guaranteeCount="undefined"
                    :startDate="fromDateA"
                    :highlightDate="toDateA"
                    class="w-full h-full"
                />
            </div>
            <div v-if="includeB" :style="{ width: (sizePx - 30) + 'px', height: bHeightPx + 'px' }">
                <AppStatsImage
                    ref="chartBRef"
                    :app="props.app"
                    :logs="logsB"
                    :fromDate="fromDateB"
                    :toDate="toDateB"
                    :cols="colsB"
                    class="w-full h-full"
                />
            </div>
        </div>
    </Teleport>
</template>
