<script setup lang="ts">
import { DateTime } from "luxon"
import { useToast } from "primevue/usetoast"
import { useI18n } from "vue-i18n"
import type ChartAppPullStats from "~/components/chart/AppPullStats.vue"
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
type RangeKey = "1d" | "1w" | "2w" | "1m"
type GraphTarget = "AB" | "A" | "B"
const range = ref<RangeKey>("1w")
const graph = ref<GraphTarget>("AB")
const loading = ref(false)
const error = ref<string | null>(null)
const isDemoUser = computed(() => userStore.hasUserRole("demo"))

// Derived
const rangeDays = computed<number>(() => {
    switch (range.value) {
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
const toDate = computed(() => props.targetDate)
const fromDate = computed(() => {
    const end = DateTime.fromISO(props.targetDate).startOf("day")
    const start = end.minus({ days: rangeDays.value - 1 })
    return start.toISODate() ?? props.targetDate
})
// Chart instances
const chartARef = ref<InstanceType<typeof ChartLatestPullHistory> | null>(null)
const chartBRef = ref<InstanceType<typeof ChartAppPullStats> | null>(null)

// Data
const chartAData = ref<ChartDataPoint[]>([])
const chartBCalc = ref<AppPullStats[]>([])

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
        const logs = await logStore.fetchLogs(props.app.appId, {
            fromDate: fromDate.value,
            toDate: toDate.value,
        })
        // A: チャートデータ
        const raw: ChartDataPoint[] = logs.map((log) => ({
            date: log.date,
            total_pulls: log.total_pulls,
            rare_pulls: log.discharge_items,
            expense: log.expense_decimal ?? 0,
        }))
        // LatestPullHistory は本日終点のため、対象日が末尾になるよう日付をシフト
        const today = DateTime.now().startOf("day")
        const target = DateTime.fromISO(props.targetDate).startOf("day")
        const delta = Math.floor(today.diff(target, "days").days)
        chartAData.value = raw.map((d) => ({
            ...d,
            date: delta !== 0 ? shiftDate(d.date, delta) : d.date,
        }))
        // B: アプリ統計（対象アプリのみ）
        const byApp: Record<string, DateLog[]> = {
            [props.app.appId]: logs,
        }
        chartBCalc.value = stats.getAppPullStats(byApp, [props.app])
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : String(e)
    } finally {
        loading.value = false
    }
}

watch(
    [() => props.app?.appId, () => props.targetDate, rangeDays],
    () => {
        loadData()
    },
    { immediate: true },
)

function close() {
    emit("update:visible", false)
    emit("close")
}

function getThemeBackground(): string | null {
    const style = getComputedStyle(document.body)
    return style?.backgroundColor || null
}

async function handleDownload() {
    if (isDemoUser.value) return
    error.value = null
    try {
        const width = 640
        const margin = 15
        const innerW = width - margin * 2
        const bg = getThemeBackground()
        const images: Blob[] = []
        if (graph.value !== "B") {
            const blobA = await chartARef.value?.toImage(innerW, null)
            if (!blobA) throw new Error("failed to capture chart A")
            images.push(blobA)
        }
        if (graph.value !== "A") {
            const blobB = await chartBRef.value?.toImage(innerW, null)
            if (!blobB) throw new Error("failed to capture chart B")
            images.push(blobB)
        }
        const composed = await composeVertical(images, {
            width,
            margin,
            gap: 15,
            background: bg,
            watermarkText: "PullLog.net",
        })
        const tag = graph.value === "AB" ? "AB" : graph.value
        const fileName = `pulllog_${props.app.appId}_${props.targetDate}_${range.value}_${tag}.png`
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
</script>

<template>
    <Dialog :visible="visible" modal :closable="false" class="w-[48rem] max-w-[96vw] dark:bg-gray-800" @update:visible="$emit('update:visible', $event)">
        <template #header>
            <div class="w-full flex items-center justify-between p-2 pb-0">
                <h3 class="text-primary-800 dark:text-primary-400 text-lg font-medium">{{ t('modal.shareImage.title') }}</h3>
                <Button icon="pi pi-times" class="h-8 w-8 m-0 p-0 rounded-full hover:bg-surface-200/50 hover:text-primary-500 dark:hover:bg-gray-700/40" @click="close" :aria-label="t('modal.shareImage.dismiss')" />
            </div>
        </template>
        <div class="flex flex-col gap-3 p-2">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <!-- 設定 -->
                <div class="flex flex-col gap-3">
                    <div>
                        <label class="block mb-1 text-sm">{{ t('modal.shareImage.range') }}</label>
                        <ButtonGroup class="border rounded-md overflow-hidden">
                            <Button size="small" :label="t('modal.shareImage.ranges.today')" :class="{ 'bg-primary-500 text-white': range==='1d' }" @click="range='1d'" />
                            <Button size="small" :label="t('modal.shareImage.ranges.week1')" :class="{ 'bg-primary-500 text-white': range==='1w' }" @click="range='1w'" />
                            <Button size="small" :label="t('modal.shareImage.ranges.week2')" :class="{ 'bg-primary-500 text-white': range==='2w' }" @click="range='2w'" />
                            <Button size="small" :label="t('modal.shareImage.ranges.month1')" :class="{ 'bg-primary-500 text-white': range==='1m' }" @click="range='1m'" />
                        </ButtonGroup>
                    </div>
                    <div>
                        <label class="block mb-1 text-sm">{{ t('modal.shareImage.targets') }}</label>
                        <ButtonGroup class="border rounded-md overflow-hidden">
                            <Button size="small" :label="t('modal.shareImage.targetsBoth')" :class="{ 'bg-primary-500 text-white': graph==='AB' }" @click="graph='AB'" />
                            <Button size="small" :label="t('modal.shareImage.targetA')" :class="{ 'bg-primary-500 text-white': graph==='A' }" @click="graph='A'" />
                            <Button size="small" :label="t('modal.shareImage.targetB')" :class="{ 'bg-primary-500 text-white': graph==='B' }" @click="graph='B'" />
                        </ButtonGroup>
                    </div>
                    <Message v-if="isDemoUser" severity="warn" size="small">{{ t('app.error.demoDetail') }}</Message>
                    <Message v-if="error" severity="error" size="small">{{ error }}</Message>
                </div>

                <!-- プレビュー -->
                <div class="flex flex-col gap-3">
                    <div v-if="graph!=='B'" class="relative h-60 w-full border rounded bg-surface-50/50 dark:bg-gray-950/40 p-1">
                        <ChartLatestPullHistory
                            ref="chartARef"
                            :chartData="chartAData"
                            :range="rangeDays"
                            :currencyCode="props.app.currency_code ?? ''"
                            :guaranteeCount="props.app.guarantee_count ?? undefined"
                            class="w-full h-full"
                            @bar-click="() => {}"
                        />
                    </div>
                    <div v-if="graph!=='A'" class="relative h-60 w-full border rounded bg-surface-50/50 dark:bg-gray-950/40 p-1">
                        <!-- ChartAppPullStats ref="chartBRef" :data="chartBCalc" / -->
                        <HistoryStats
                            ref="chartBRef"
                            :internalAppId="props.app.appId"
                            :label="''"
                            class="w-full h-full"
                        />
                    </div>
                    <div v-if="loading" class="text-sm text-muted">{{ t('app.loading') }}</div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <Button :label="t('modal.shareImage.commit')" class="btn btn-primary w-full" :disabled="loading || isDemoUser" @click="handleDownload" />
                <Button :label="t('modal.shareImage.cancel')" class="btn btn-alternative w-full" @click="close" />
            </div>
        </div>
    </Dialog>
</template>
