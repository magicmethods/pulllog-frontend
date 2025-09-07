<script setup lang="ts">
import { DateTime } from "luxon"
import { useI18n } from "vue-i18n"
import { useChartPalette } from "~/composables/useChart"
import { useCurrencyStore } from "~/stores/useCurrencyStore"

const props = defineProps<{
    app: AppData
    /** 集計対象のログ（指定期間にフィルタ済み） */
    logs: DateLog[]
    /** 期間表示用 */
    fromDate: string
    toDate: string
    /** KPIグリッドの列数（s=1, m=2, l=3 を想定） */
    cols?: number
}>()

const currencyStore = useCurrencyStore()
const { t, locale } = useI18n()
const { palette } = useChartPalette()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const PAD = 12
const DONUT_FIXED = 140 // 小サイズ基準の直径（全サイズで共通）
const B_RATIO = 0.4 // 互換用（未使用の場面を最小化）

const stats = computed(() => {
    const list = props.logs ?? []
    const totalPulls = list.reduce((s, l) => s + (l.total_pulls || 0), 0)
    const rare = list.reduce((s, l) => s + (l.discharge_items || 0), 0)
    const totalExpense = list.reduce((s, l) => s + (l.expense_decimal || 0), 0)
    const target = list.find((l) => l.date === props.toDate)
    const expenseOnTarget = target?.expense_decimal ?? 0
    const totalLogs = list.length
    // 期間の月数（端数切上げ）
    const start = DateTime.fromISO(props.fromDate)
    const end = DateTime.fromISO(props.toDate)
    const monthsInPeriod = Math.max(
        1,
        Math.ceil(end.diff(start, "months").months || 1),
    )
    const rareRate = totalPulls > 0 ? (rare / totalPulls) * 100 : 0
    const avgPerRare = rare > 0 ? totalPulls / rare : 0
    return {
        totalPulls,
        rare,
        totalExpense,
        expenseOnTarget,
        totalLogs,
        monthsInPeriod,
        rareRate,
        avgPerRare,
    }
})

const hasData = computed(() => stats.value.totalPulls > 0)

function draw(canvas: HTMLCanvasElement, bg?: string | null) {
    const dpr = window.devicePixelRatio || 1
    const parent = containerRef.value
    const w = Math.max(320, Math.floor(parent?.clientWidth || 480))
    // Bキャンバス高さはドーナッツ直径 + パディング上下
    const h = PAD * 2 + DONUT_FIXED
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    // 背景
    if (typeof bg === "string") {
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, w, h)
    }
    // パディング
    const pad = PAD
    const colGap = 16
    // ドーナツサイズはキャンバス高さに追従（小さすぎない範囲で）
    // ドーナッツは小サイズ時の大きさを基準とし、全サイズで一定
    const donutSize = Math.min(DONUT_FIXED, Math.floor(h - pad * 2))
    const donutX = pad + donutSize / 2
    const donutY = pad + donutSize / 2
    const ringW = Math.max(12, Math.floor(donutSize * 0.13))
    // ドーナツ（レア率）
    const rate = Math.max(0, Math.min(100, stats.value.rareRate))
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + (Math.PI * 2 * rate) / 100
    // 背面（その他）
    ctx.beginPath()
    ctx.lineWidth = ringW
    ctx.strokeStyle = palette.value.other
    ctx.arc(donutX, donutY, donutSize / 2 - ringW / 2, 0, Math.PI * 2)
    ctx.stroke()
    // 手前（レア）
    ctx.beginPath()
    ctx.lineWidth = ringW
    ctx.strokeStyle = palette.value.rare
    ctx.arc(donutX, donutY, donutSize / 2 - ringW / 2, startAngle, endAngle)
    ctx.stroke()
    // 中央テキスト（大きめ・レア色）
    ctx.fillStyle = palette.value.rare
    ctx.font = "700 26px system-ui, -apple-system, Segoe UI, Roboto"
    const txt = `${rate.toFixed(2)}`
    const tw = ctx.measureText(txt).width
    ctx.fillText(txt, donutX - tw / 2, donutY + 8)
    ctx.fillStyle = palette.value.rare
    ctx.font = "500 13px system-ui, -apple-system, Segoe UI, Roboto"
    const pct = "%"
    ctx.fillText(pct, donutX + tw / 2 + 3, donutY + 5)

    // 右側KPI
    const rightX = donutX + donutSize / 2 + colGap
    const kpiRows = [
        ["totalPulls", stats.value.totalPulls.toLocaleString()],
        ["rareDropCount", stats.value.rare.toLocaleString()],
        [
            "totalExpense",
            `${currencyStore.get(props.app.currency_code ?? "")?.symbol_native ?? ""} ${stats.value.totalExpense.toLocaleString()}`,
        ],
        [
            "expenseOnTarget",
            `${currencyStore.get(props.app.currency_code ?? "")?.symbol_native ?? ""} ${stats.value.expenseOnTarget.toLocaleString()}`,
        ],
        ["registeredDays", stats.value.totalLogs.toLocaleString()],
        [
            "averageRareDropRate",
            stats.value.avgPerRare === 0
                ? "0"
                : stats.value.avgPerRare.toFixed(2),
        ],
    ]
    const labels: Record<string, string> = {
        totalPulls: t("history.historyStats.totalPulls"),
        rareDropCount: t("history.historyStats.rareDropCount"),
        totalExpense: t("history.historyStats.totalExpense"),
        expenseOnTarget: t("history.historyStats.expenseOnTarget"),
        registeredDays: t("history.historyStats.registeredDays"),
        averageRareDropRate: t("history.historyStats.averageRareDropRate"),
    }
    // KPI グリッド描画（列数指定に合わせて均等配置）
    const cols = Math.max(1, Math.min(3, props.cols ?? 1))
    const gridX = rightX
    const gridW = Math.max(120, w - gridX - pad)
    const colW = gridW / cols
    const items = kpiRows
    const rowsCount = Math.ceil(items.length / cols)
    // KPIエリアの縦はドーナツ領域に揃える
    const gridYTop = donutY - donutSize / 2
    const gridYBottom = donutY + donutSize / 2
    const rowH = (gridYBottom - gridYTop) / rowsCount

    // フォントサイズ（列数で近似: 1→小, 2→中, 3→大）
    const labelFontSize = cols === 1 ? 12 : cols === 2 ? 13 : 14
    const valueFontSize = cols === 1 ? 14 : cols === 2 ? 16 : 18

    let idx = 0
    if (cols === 1) {
        // 小サイズ: 1列で段組みなし、左寄せ。ラベルと値の間隔を広めに。
        ctx.textAlign = "left"
        // ラベル最大幅を先に測って揃える
        ctx.fillStyle = "oklch(60% 0.02 255)"
        ctx.font = `400 ${labelFontSize}px system-ui, -apple-system, Segoe UI, Roboto`
        const labelMaxW = items.reduce((max, it) => {
            const w = ctx.measureText(labels[it[0]]).width
            return Math.max(max, w)
        }, 0)
        const em = ctx.measureText("M").width
        for (let r = 0; r < rowsCount; r++) {
            if (idx >= items.length) break
            const item = items[idx++]
            const cellX = gridX
            const cellY = gridYTop + r * rowH
            const centerY = cellY + rowH * 0.55
            // ラベル
            ctx.fillStyle = "oklch(60% 0.02 255)"
            ctx.font = `400 ${labelFontSize}px system-ui, -apple-system, Segoe UI, Roboto`
            const labelText = labels[item[0]]
            ctx.fillText(labelText, cellX, centerY)
            // 値（ラベルの直後 + 1文字分の余白）
            const valueX = cellX + labelMaxW + em
            ctx.fillStyle = palette.value.text
            ctx.font = `600 ${valueFontSize}px system-ui, -apple-system, Segoe UI, Roboto`
            ctx.fillText(String(item[1]), valueX, centerY)
        }
    } else {
        // 中/大: 多列でラベル上・値下の段組み、中央寄せ
        ctx.textAlign = "center"
        for (let r = 0; r < rowsCount; r++) {
            for (let c = 0; c < cols; c++) {
                if (idx >= items.length) break
                const item = items[idx++]
                const cellCenterX = gridX + c * colW + colW / 2
                const cellY = gridYTop + r * rowH
                const labelY = cellY + rowH * 0.38
                const valueY = cellY + rowH * 0.74
                // ラベル
                ctx.fillStyle = "oklch(60% 0.02 255)"
                ctx.font = `400 ${labelFontSize}px system-ui, -apple-system, Segoe UI, Roboto`
                ctx.fillText(labels[item[0]], cellCenterX, labelY)
                // 値（中央寄せ）
                ctx.fillStyle = palette.value.text
                ctx.font = `600 ${valueFontSize}px system-ui, -apple-system, Segoe UI, Roboto`
                ctx.fillText(String(item[1]), cellCenterX, valueY)
            }
        }
    }
}

onMounted(() => {
    nextTick(() => {
        if (canvasRef.value) draw(canvasRef.value)
    })
})

watch([() => props.logs, () => props.fromDate, () => props.toDate], () => {
    nextTick(() => {
        if (canvasRef.value) draw(canvasRef.value)
    })
})
watch(
    () => locale.value,
    () => {
        nextTick(() => {
            if (canvasRef.value) draw(canvasRef.value)
        })
    },
)

/**
 * 現在の描画内容をPNGとして出力
 */
async function toImage(
    width?: number,
    background?: string | null,
): Promise<Blob> {
    const dpr = window.devicePixelRatio || 1
    const baseW = typeof width === "number" && width > 0 ? width : 480
    const baseH = Math.floor(baseW * B_RATIO)
    const off = document.createElement("canvas")
    off.width = Math.floor(baseW * dpr)
    off.height = Math.floor(baseH * dpr)
    const ctx = off.getContext("2d")
    if (!ctx) throw new Error("canvas context not available")
    ctx.scale(dpr, dpr)
    draw(off, background === undefined ? palette.value.bg : background)
    const blob: Blob | null = await new Promise((resolve) =>
        off.toBlob((b) => resolve(b), "image/png"),
    )
    if (!blob) throw new Error("failed to export image")
    return blob
}

defineExpose({ toImage, hasData })
</script>

<template>
    <div ref="containerRef" class="w-full h-full">
        <canvas ref="canvasRef" class="w-full h-full"></canvas>
    </div>
</template>

<style scoped>
</style>
