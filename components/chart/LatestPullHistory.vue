<script setup lang="ts">
import type { ActiveElement, ChartEvent, Chart as ChartJS } from "chart.js"
import { DateTime } from "luxon"
import { useI18n } from "vue-i18n"
import { useChartPalette } from "~/composables/useChart"
import { useCurrencyStore } from "~/stores/useCurrencyStore"
import { getLabelsAndMap } from "~/utils/date"

// Props & Emits
const props = defineProps<{
    chartData: ChartDataPoint[]
    range: number // グラフ範囲の日数
    currencyCode: string // アプリごとの通貨コード
    guaranteeCount?: number // 天井回数（オプション、指定があれば表示）
    /** 強調表示する対象日のISO（points[].dateと一致する想定）。未指定時は末尾を強調 */
    highlightDate?: string
    /** ラベル生成の開始日（YYYY-MM-DD）。指定時はこの日付からrange日分を描画し、末尾が開始日+range-1日になる */
    startDate?: string
}>()
const emit = defineEmits<(e: "bar-click", date: string) => void>()

// Stores & i18n
const currencyStore = useCurrencyStore()
const { t } = useI18n()

// Composables
const { palette } = useChartPalette()

// X軸ラベル・グラフ用データ配列
// ラベルとプロット点は props 依存で再計算（startDate指定時は軸の末尾= startDate + range - 1）
const mapped = computed(() =>
    getLabelsAndMap(props.chartData, props.range, props.startDate),
)
const labels = computed(() => mapped.value.labels)
const points = computed(() => mapped.value.points)

// ChartJS インスタンス
const chartIns = ref<ChartJS | null>(null)
function onChartReady(chart: ChartJS) {
    chartIns.value = chart
    const canvas = chart.canvas
    if (canvas) {
        canvas.addEventListener("mouseleave", () => {
            canvas.style.cursor = "default"
        })
    }
}
// ホバー中のインデックス（tooltip.externalで更新）
const hoverIndex = ref<number | null>(null)

const currencySymbol = computed(() => {
    const cd = currencyStore.get(props.currencyCode)
    return cd ? cd.symbol_native : ""
})
// グラフデータ
function oklchSaturate(color: string, ratio = 1.2): string {
    // oklch( L% C H / A? ) 形式のみ簡易対応
    const m = color.match(
        /oklch\(\s*([0-9.]+)%\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+))?\s*\)/i,
    )
    if (!m) return color
    const l = Number(m[1])
    const c = Number(m[2])
    const h = Number(m[3])
    const a = m[4] ? Number(m[4]) : null
    const newC = Math.min(c * ratio, 0.37) // 安全上限（経験値）
    return a === null
        ? `oklch(${l}% ${newC} ${h})`
        : `oklch(${l}% ${newC} ${h} / ${a})`
}

const datasets = computed(() => {
    const idx = (() => {
        if (props.highlightDate) {
            const i = points.value.findIndex(
                (p) => p.date === props.highlightDate,
            )
            if (i >= 0) return i
        }
        return labels.value.length > 0 ? labels.value.length - 1 : -1
    })()
    const rareBase = palette.value.rare
    const otherBase = palette.value.other
    const rareHi = oklchSaturate(rareBase, 1.2)
    const otherHi = oklchSaturate(otherBase, 1.2)

    const otherColors = points.value.map((_, i) =>
        i === idx ? otherHi : otherBase,
    )
    const rareColors = points.value.map((_, i) =>
        i === idx ? rareHi : rareBase,
    )

    return [
        {
            type: "line" as const,
            label: t("history.historyChart.expense", {
                currency: currencySymbol.value,
            }),
            yAxisID: "y1",
            data: points.value.map((d) => Number(d.expense || 0)),
            borderColor: palette.value.expense,
            backgroundColor: palette.value.expense,
            tension: 0.1,
            fill: false,
            pointRadius: 0, // ポイントサイズ（0: 非表示）
        },
        {
            type: "bar" as const,
            label: t("history.historyChart.other"),
            stack: "pulls",
            data: points.value.map(
                (d) => Number(d.total_pulls || 0) - Number(d.rare_pulls || 0),
            ),
            backgroundColor: otherColors,
        },
        {
            type: "bar" as const,
            label: t("history.historyChart.rare"),
            stack: "pulls",
            data: points.value.map((d) => Number(d.rare_pulls || 0)),
            backgroundColor: rareColors,
        },
    ]
})

// 天井補助線のannotations計算
const pityAnnotations = computed(() => {
    if (!props.guaranteeCount) return {}
    // y軸最大値の計算
    const yMax = calcYAxisMax(points.value, "total_pulls", 20)
    const interval = props.guaranteeCount
    // biome-ignore lint:/suspicious/noExplicitAny chartjs-plugin-annotation用の型
    const annotations: Record<string, any> = {}
    for (let v = interval; v <= yMax; v += interval) {
        annotations[`pityLine${v}`] = {
            type: "line",
            yMin: v,
            yMax: v,
            borderColor: palette.value.annotationBorder,
            borderWidth: 1.5,
            borderDash: [4, 4],
            label: {
                enabled: true,
                content: t("history.historyChart.pityLine", { count: v }),
                position: "start",
                backgroundColor: palette.value.annotationBg,
                color: palette.value.annotationText,
                font: { size: 11, weight: "bold" },
                yAdjust: -6,
            },
        }
    }
    return annotations
})

// クリック/ホバー制御
function emitIsoDateByIndex(idx: number) {
    // 1) points[idx].date があれば最優先（サーバ由来のISO日付）
    const p = points.value[idx] as { date?: string } | undefined
    if (p && typeof p.date === "string" && p.date.length > 0) {
        emit("bar-click", p.date)
        return
    }
    // 2) インデックス→今日を終端に逆算（年跨ぎも確実）
    const end = DateTime.now().startOf("day") // 局所タイムゾーン
    const offset = labels.value.length - 1 - idx
    if (offset >= 0) {
        const iso = end.minus({ days: offset }).toISODate()
        if (iso) {
            emit("bar-click", iso)
            return
        }
    }
    // 3) ラベル M/D をパースし、今日より大きければ前年扱い
    const lbl = labels.value[idx]
    const byLabel = parseMonthDayToISO(lbl, end)
    if (byLabel) {
        emit("bar-click", byLabel)
    }
}
/*
function handleChartClick(evt: ChartEvent, active: ActiveElement[], chart?: ChartJS) {
    //console.log('HistoryChart::handleChartClick:', evt, active, chart)
    if (!active || active.length === 0) return
    const first = active[0]
    const idx = typeof first.index === 'number' ? first.index : -1
    //console.log('HistoryChart::handleChartClick[2]:', first, idx)
    if (idx < 0) return
    const allLabels = (chart?.data?.labels ?? []) as string[]
    const date = allLabels[idx]
    console.log('HistoryChart::handleChartClick[3]:', date, DateTime.fromISO(date).toFormat('yyyy-MM-dd'))
    if (typeof date === 'string' && date.length > 0) {
        emit('bar-click', date) // YYYY-MM-DD を親へ
    }
}*/
function handleChartClick(
    _evt: ChartEvent,
    active: ActiveElement[],
    chart?: ChartJS,
) {
    // active が無いケースは最後に hoverIndex を使う
    let idx = active && active.length > 0 ? active[0].index : null
    if (idx === null || typeof idx !== "number") {
        idx = hoverIndex.value
    }
    if (typeof idx === "number" && idx >= 0 && idx < labels.value.length) {
        emitIsoDateByIndex(idx)
    }
    if (chart?.canvas) chart.canvas.style.cursor = "default"
}
function handleChartHover(
    _evt: ChartEvent,
    active: ActiveElement[],
    chart?: ChartJS,
) {
    const canvas = chart?.canvas
    if (!canvas) return
    canvas.style.cursor = active && active.length > 0 ? "pointer" : "default"
}

const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    onClick: handleChartClick,
    //onHover: handleChartHover,
    plugins: {
        legend: {
            position: "bottom", // 凡例は下部
            labels: {
                color: palette.value.legend,
                usePointStyle: true, // ポイントスタイルを使用
                pointStyle: "rectRounded", // ポイントの形状
                pointStyleWidth: 12, // ポイントのサイズ
                padding: 15,
                boxHeight: 11,
                font: { size: 12 },
                sort: (
                    // biome-ignore lint:/suspicious/noExplicitAny
                    a: any,
                    // biome-ignore lint:/suspicious/noExplicitAny
                    b: any,
                ) => {
                    const ai =
                        typeof a.datasetIndex === "number"
                            ? a.datasetIndex
                            : Number.MAX_SAFE_INTEGER
                    const bi =
                        typeof b.datasetIndex === "number"
                            ? b.datasetIndex
                            : Number.MAX_SAFE_INTEGER
                    return bi - ai // 項目を逆順に
                },
            },
        },
        tooltip: {
            backgroundColor: palette.value.tooltipBg, // ツールチップ背景
            titleColor: palette.value.tooltipText, // タイトル文字色
            bodyColor: palette.value.tooltipText, // 本文文字色
            borderColor: palette.value.tooltipBorder, // ボーダー色
            borderWidth: 1,
            itemSort: (
                // biome-ignore lint:/suspicious/noExplicitAny
                a: any,
                // biome-ignore lint:/suspicious/noExplicitAny
                b: any,
            ) => b.datasetIndex - a.datasetIndex, // 項目を逆順に
            // biome-ignore lint:/suspicious/noExplicitAny
            external: (ctx: any) => {
                // ctx.tooltip.title -> ['8/9'] のような配列
                const chart: ChartJS | undefined = ctx?.chart
                const tip = ctx?.tooltip
                const canvas = chart?.canvas
                if (canvas && tip) {
                    // tooltip が出ている間だけ pointer、消えたら default
                    const visible = !(tip.opacity === 0) // typeof tip.opacity === 'number' ? tip.opacity > 0 : false
                    canvas.style.cursor = visible ? "pointer" : "default"
                    // ホバー中の index を保持（クリックのフォールバック用）
                    const dp =
                        Array.isArray(tip.dataPoints) &&
                        tip.dataPoints.length > 0
                            ? tip.dataPoints[0]
                            : undefined
                    hoverIndex.value =
                        typeof dp?.dataIndex === "number" ? dp.dataIndex : null
                }
            },
        },
        annotation: {
            annotations: {
                ...pityAnnotations.value, // 天井補助線
            },
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            stacked: true,
            position: "left" as const,
            max: calcYAxisMax(points.value, "total_pulls", 20), // 最大値自動計算
            ticks: {
                stepSize: 10,
                color: palette.value.text,
                font: { size: 12 },
            },
            grid: { color: palette.value.grid },
            title: {
                color: palette.value.text,
                display: true,
                text: t("history.historyChart.pulls"),
            },
            border: { color: palette.value.axis },
        },
        y1: {
            beginAtZero: true,
            position: "right" as const,
            max: currencyStore.getYAxisMax(
                calcYAxisMax(points.value, "expense"),
                props.currencyCode,
            ),
            ticks: {
                stepSize: currencyStore.getStepSize(props.currencyCode),
                color: palette.value.text,
                font: { size: 12 },
                callback: (v: string | number) => v.toLocaleString(),
            },
            grid: { color: palette.value.grid, drawOnChartArea: false },
            title: {
                color: palette.value.text,
                display: true,
                text: t("history.historyChart.expense", {
                    currency: currencySymbol.value,
                }),
            },
            border: { color: palette.value.axis },
        },
        x: {
            stacked: true,
            ticks: {
                autoSkip: true,
                maxTicksLimit:
                    labels.value.length > 12 ? 12 : labels.value.length,
                maxRotation: 90,
                minRotation: 30,
                color: palette.value.text,
                font: { size: 12 },
            },
            grid: { color: palette.value.grid },
            title: {
                color: palette.value.text,
                display: false,
                text: t("history.historyChart.date"),
            },
            border: { color: palette.value.axis },
        },
    },
}))
const chartData = computed(() => ({
    labels: labels.value,
    datasets: datasets.value,
}))

/**
 * 現在のチャートをPNGとして出力
 * @param width 出力幅（px）。未指定はキャンバス幅
 * @param background 背景色（CSSカラー文字列）。未指定は透過
 */
async function toImage(
    width?: number,
    background?: string | null,
): Promise<Blob> {
    const chart = chartIns.value
    const canvas = chart?.canvas
    if (!canvas) throw new Error("chart not ready")

    const srcW = canvas.width
    const srcH = canvas.height
    const targetW = typeof width === "number" && width > 0 ? width : srcW
    const targetH = Math.round((targetW / srcW) * srcH)

    const off = document.createElement("canvas")
    off.width = targetW
    off.height = targetH
    const ctx = off.getContext("2d")
    if (!ctx) throw new Error("canvas context not available")
    if (background) {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, targetW, targetH)
    }
    ctx.drawImage(canvas, 0, 0, targetW, targetH)
    const blob: Blob | null = await new Promise((resolve) =>
        off.toBlob((b) => resolve(b), "image/png"),
    )
    if (!blob) throw new Error("failed to export image")
    return blob
}

defineExpose({ toImage })

// Methods
/**
 * Y軸最大値を任意の「桁数・単位」で繰り上げて返す
 * @param points - データ配列
 * @param key - 集計対象のキー
 * @param roundUpUnit - 繰り上げ単位（例: 10, 100, 1000 など、デフォルトは最大値の桁数に応じて自動）
 * @param alwaysUpper - 最大値がピッタリ区切りの場合も一段階大きくする（デフォルトtrue）
 * @returns number
 */
function calcYAxisMax(
    // biome-ignore lint:/suspicious/noExplicitAny
    points: any[],
    key: string,
    roundUpUnit?: number,
    alwaysUpper = true,
) {
    const max = Math.max(...points.map((d) => Number(d[key] ?? 0)))
    if (max === 0) return 1
    // 繰り上げ単位を自動計算 or 指定
    let unit = roundUpUnit
    if (!unit) {
        // 1, 10, 100, 1000...で最大値の桁数に合わせる
        unit = 10 ** Math.floor(Math.log10(max))
    }
    let yMax = Math.ceil(max / unit) * unit
    // ぴったり割り切れていた場合も、常にもう一段階上げたい場合
    if (alwaysUpper && yMax <= max) {
        yMax += unit
    }
    return yMax
}
/** 'M/D' → 'YYYY-MM-DD'（今日より大きい月日は前年扱い） */
function parseMonthDayToISO(md: string, today: DateTime): string | null {
    const m = md.match(/^(\d{1,2})\/(\d{1,2})$/)
    if (!m) return null
    const month = Number(m[1])
    const day = Number(m[2])
    if (Number.isNaN(month) || Number.isNaN(day)) return null
    const mdVal = month * 100 + day
    const todayVal = today.month * 100 + today.day
    const year = mdVal > todayVal ? today.year - 1 : today.year
    const dt = DateTime.local(year, month, day).startOf("day")
    return dt.isValid ? dt.toISODate() : null
}
</script>

<template>
    <div class="chart-bar w-full h-full relative" :style="{ backgroundColor: palette.bg }">
        <CommonChart
            type="bar"
            :data="chartData"
            :options="chartOptions"
            @chartReady="onChartReady"
        />
    </div>
</template>

<style lang="scss" scoped>
/* 補助: Chart.js のキャンバスは onHover で cursor 切替済みだが、初期値だけ明示 */
:deep(canvas) {
    cursor: default;
}
</style>
