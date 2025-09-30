<script setup lang="ts">
import type { ChartDataset } from "chart.js"
// biome-ignore lint/correctness/noUnusedImports: used in template via :plugins
import ChartDataLabels from "chartjs-plugin-datalabels"
import { useI18n } from "vue-i18n"
import { useChartPalette } from "~/composables/useChart"
import { useOptionStore } from "~/stores/useOptionStore"
import { useUserStore } from "~/stores/useUserStore"
import { classifyMarkerText } from "~/utils/markerMatcher"
import { stripEmoji } from "~/utils/string"

// Stores etc.
const userStore = useUserStore()
const optionStore = useOptionStore()
const { t, locale } = useI18n()

const SYSTEM_OTHER_KEY = computed(() => optionStore.otherPlaceholder)
const PRESET_MARKER_LABELS = [
    "pickup",
    "lose",
    "target",
    "guaranteed",
    "other",
] as const
type MarkerKey = (typeof PRESET_MARKER_LABELS)[number]

// Props
const props = defineProps<{
    data: RareDropRanking // 集計データ（複数アプリ分だが基本は単アプリ分を抽出して使う）
    appId: string // 対象アプリID
    maxRank?: number // 出力最大順位（オプション）
    colors?: Record<MarkerKey, ChartColor> // アイテム名ごとの色（オプション）
}>()

// Composables
const { theme, presetColors, palette } = useChartPalette()

// Refs & Local State
// 1 行あたりの高さ(px)。視認性重視で 28〜32px が目安
const ROW_HEIGHT_PX = 32
// 追加: 行ギャップの比率（0～0.6目安）
const ROW_GAP_RATIO = 0.5
// 実バー厚（px）＝ 行高 × (1 - ギャップ比率)
// スタックでも各セグメントは同じ厚みで描かれます
const EFFECTIVE_BAR_THICKNESS = Math.floor(ROW_HEIGHT_PX * (1 - ROW_GAP_RATIO))
// 少数でも小さすぎないよう最低高さを持たせる（行数 6 分＝168px 程度）
const MIN_ROWS = 6
// ラベルマップ
const labelMap = computed<Record<MarkerKey, string>>(() => ({
    pickup: t("app.word.pickup"),
    lose: t("app.word.lose"),
    target: t("app.word.target"),
    guaranteed: t("app.word.guaranteed"),
    other: t("app.word.other"),
}))
const otherLabel = computed(() => t("app.word.other"))
// 色マップ
const colorMap = computed<ColorMap>(() => {
    const map: ColorMap = {}
    const preset = presetColors.value
    PRESET_MARKER_LABELS.forEach((label: MarkerKey, i: number) => {
        map[label] = props.colors?.[label] ?? preset[i % preset.length]
    })
    return map
})
// 対象アプリのデータを抽出
const ranking = computed(() => props.data.find((d) => d.appId === props.appId))
// アイテム名一覧（カウント降順→アルファベット順→五十音順）
const sortedNames = computed(() => {
    if (!ranking.value) return []
    // rarityName: { "rarity|name": count }
    // name: { "itemName": count }
    const itemArr = Object.entries(ranking.value.items.name)

    // システム「その他」を抽出
    const etcIdx = itemArr.findIndex(
        ([name]) => name === SYSTEM_OTHER_KEY.value,
    )
    let etcEntry: [string, number] | undefined
    if (etcIdx >= 0) {
        etcEntry = itemArr.splice(etcIdx, 1)[0]
    }

    // ソート（降順→ABC順→五十音順）
    itemArr.sort((a, b) => {
        // 降順→数が同じならアルファベット→五十音順
        if (b[1] !== a[1]) return b[1] - a[1]
        // localeCompareで多言語対応
        return a[0].localeCompare(b[0], locale.value)
    })
    const mapped = itemArr.map(([name, count]) => ({
        name,
        label: `${name} (${count})`,
    }))

    // システム「その他」をラベル変換して末尾に追加
    if (etcEntry) {
        mapped.push({
            name: SYSTEM_OTHER_KEY.value,
            label: `${otherLabel.value} (${etcEntry[1]})`,
        })
    }

    // maxRank対応
    if (props.maxRank && props.maxRank > 0) {
        return mapped.slice(0, props.maxRank) /* .map(([name, count]) => ({
            name,
            label: `${name} (${count})`
        }))*/
    }
    return mapped
})

// レアリティ・パース＋カウント
const rarityStats = computed(() => {
    if (!ranking.value) return {}
    // rarityName: { "rarity|name": count }
    // name: { "itemName": count }
    const map: Record<string, Partial<Record<string, number>>> = {}
    for (const [key, value] of Object.entries(ranking.value.items.rarityName)) {
        let [rarity, name] = key.split("|")
        rarity = rarity.trim()
        name = stripEmoji(name).trim()
        const label = rarity !== "" ? rarity : "rare"
        map[name] = map[name] || {}
        map[name][label] = (map[name][label] ?? 0) + value
    }
    return map // { "itemName": { rarity: count, ... } }
})

const raritySummary = computed(() => {
    if (Object.keys(rarityStats.value).length === 0) return {}
    // rarityStatsのrarityごとの合計値
    const summary: Record<string, number> = {}
    for (const item of Object.values(rarityStats.value)) {
        for (const [rarity, count] of Object.entries(item)) {
            summary[rarity] = (summary[rarity] ?? 0) + (count ?? 0)
        }
    }
    return summary
})

type Marker = "pickup" | "lose" | "target" | "guaranteed"

// マーカー・パース＋合計
const markerKeys = computed(() => {
    if (!ranking.value) return {}
    // markerName: { "name|marker": count }
    const map: Record<string, Partial<Record<MarkerKey, number>>> = {}
    for (const [key, value] of Object.entries(ranking.value.items.markerName)) {
        let [name, markerText] = key.split("|")
        name = stripEmoji(name).trim()
        markerText = stripEmoji(markerText).trim()

        const cls = classifyMarkerText(markerText)
        const label: MarkerKey = (
            ["pickup", "lose", "target", "guaranteed"] as const
        ).includes(cls as Marker)
            ? (cls as MarkerKey)
            : "other"

        map[name] = map[name] || {}
        map[name][label] = (map[name][label] ?? 0) + value
    }
    return map // { "itemName": { pickup: n, lose: n, ... } }
})

// 各アイテム名の合計最大値
const maxCounts = computed(() => {
    if (!ranking.value) return {}
    const res: Record<string, number> = {}
    for (const { name } of sortedNames.value) {
        // markerごとの合計値とnameのカウント値
        const markerSum = Object.values(markerKeys.value[name] ?? {}).reduce(
            (a, b) => a + (b ?? 0),
            0,
        )
        const nameCount = ranking.value.items.name[name] ?? 0
        res[name] = Math.max(markerSum, nameCount)
    }
    return res // { "itemName": maxValue }
})

// Stack Barデータを生成
const chartData = computed(() => {
    if (!ranking.value) return { labels: [], datasets: [] }
    //const labels = sortedNames.value
    const labels = sortedNames.value.map((item) => item.label) // アイテム名のラベル

    // markerのスタックBar
    const datasets: ChartDataset[] = PRESET_MARKER_LABELS.map((marker, _i) => ({
        label: labelMap.value[marker],
        data: sortedNames.value.map(
            (item) => markerKeys.value[item.name]?.[marker] ?? 0,
        ),
        backgroundColor:
            props.colors?.[marker]?.bg ?? colorMap.value[marker].bg,
        hoverBackgroundColor:
            props.colors?.[marker]?.hover ?? colorMap.value[marker].hover,
        borderColor:
            props.colors?.[marker]?.border ?? colorMap.value[marker].border,
        borderWidth: 1,
        stack: "marker",
    })).filter((ds) => ds.data.some((v) => v > 0)) // データが0のものは除外
    // "その他" スタック：合計未満の差分
    datasets.push({
        label: labelMap.value.other,
        data: sortedNames.value.map((item) => {
            const stackedSum = PRESET_MARKER_LABELS.reduce(
                (sum, marker) =>
                    sum + (markerKeys.value[item.name]?.[marker] ?? 0),
                0,
            )
            return Math.max(0, (maxCounts.value[item.name] ?? 0) - stackedSum)
        }),
        backgroundColor: props.colors?.other?.bg ?? colorMap.value.other.bg,
        hoverBackgroundColor:
            props.colors?.other?.hover ?? colorMap.value.other.hover,
        borderColor: props.colors?.other?.border ?? colorMap.value.other.border,
        borderWidth: 1,
        stack: "marker",
    })

    return {
        labels,
        datasets,
    }
})

// ステップサイズ計算
const calcStepSize = (max: number) => {
    if (max <= 10) return 1
    const exp = Math.floor(Math.log10(max))
    const base = 10 ** (exp - 1)
    // 2, 5, 10刻みを判定
    if (max / base < 20) return 2 * base
    if (max / base < 50) return 5 * base
    return 10 * base
}
// X軸最大値（+1割り増し）
const maxValue = computed(() => {
    const arr = Object.values(maxCounts.value) as number[]
    if (!arr.length) return 10
    const max = Math.max(...arr)
    const step = calcStepSize(max)
    return Math.ceil((max * 1.1) / step) * step
})

// Chart.jsオプション
const chartOptions = computed(() => ({
    indexAxis: "y",
    plugins: {
        legend: {
            display: false,
            position: "bottom",
        },
        datalabels: {
            display: (ctx: ContextModel) => ctx.dataset.data[ctx.dataIndex] > 0,
            align: "center",
            anchor: "center",
            color: "oklch(100% 0 0)", // white
            font: { weight: "bold" },
            formatter: (value: number) => (value > 0 ? value : ""),
        },
        tooltip: {
            enabled: true,
            backgroundColor: palette.value.tooltipBg, // ツールチップ背景
            titleColor: palette.value.tooltipText, // タイトル文字色
            bodyColor: palette.value.tooltipText, // 本文文字色
            borderColor: palette.value.tooltipBorder, // ボーダー色
            borderWidth: 1,
            callbacks: {
                label: (ctx: ContextModel) =>
                    `${ctx.dataset.label}: ${ctx.parsed.x}`,
            },
        },
    },
    datasets: {
        bar: {
            barThickness: EFFECTIVE_BAR_THICKNESS, // 1本の棒の太さを固定
            maxBarThickness: EFFECTIVE_BAR_THICKNESS,
            categoryPercentage: Math.max(0.3, 1 - ROW_GAP_RATIO), // カテゴリーの占有率（行の中の棒群の幅）
            barPercentage: 0.9, // 同一カテゴリー内での棒の占有率
            borderWidth: 1,
        },
    },
    scales: {
        x: {
            position: "top",
            min: 0,
            max: maxValue.value,
            title: {
                display: false,
                text: t("stats.chart.rareDropRanking.count"),
            },
            ticks: {
                color: palette.value.text,
                stepSize: calcStepSize(maxValue.value),
            },
            border: { color: palette.value.axis },
        },
        x2: {
            position: "bottom",
            min: 0,
            max: maxValue.value,
            title: {
                display: false,
                text: t("stats.chart.rareDropRanking.count"),
            },
            ticks: {
                color: palette.value.text,
                stepSize: calcStepSize(maxValue.value),
            },
            border: { color: palette.value.axis },
        },
        y: {
            offset: true, // Y軸のオフセットを有効にしてラベルを中央に配置
            title: {
                display: false,
                text: t("stats.chart.rareDropRanking.itemName"),
            },
            grid: { color: palette.value.grid },
            ticks: {
                color: palette.value.text,
                autoSkip: false, // ラベルを間引かない（スクロール前提）
            },
            border: { color: palette.value.axis },
        },
    },
    responsive: true,
    maintainAspectRatio: false,
}))

// ツールチップを表示する
function showTooltip() {
    return {
        value: t("stats.chart.rareDropRanking.noticeLong"),
        escape: false,
        pt: {
            root: "pt-1",
            text: "w-max max-w-[30rem] p-3 bg-surface-600 text-white dark:bg-gray-800 dark:shadow-lg font-medium text-xs",
            arrow: "w-2 h-2 rotate-[45deg] border-b border-4 border-surface-600 dark:border-gray-800",
        },
    }
}
</script>

<template>
    <Card class="chart-card" :pt="{ caption: 'w-full' }">
        <template #title>
            <div class="flex items-center justify-between gap-3">
                <h3 class="text-base">
                    <span class="text-primary-800 dark:text-primary-400 mx-0.5">
                        {{ t('stats.chart.rareDropRanking.title', { appName: strBytesTruncate(ranking?.appName ?? '', 7, 80) }) }}
                    </span>
                </h3>
                <slot name="titleControls"></slot>
            </div>
        </template>
        <template #content>
            <div class="h-[12rem] overflow-y-auto">
                <div
                    class="relative min-h-max w-full"
                    :style="{
                        // 行数×行高（少数時は MIN_ROWS を下限）
                        height: Math.max(sortedNames.length, MIN_ROWS) * ROW_HEIGHT_PX + 'px'
                    }"
                >
                    <CommonChart
                        type="bar"
                        :data="chartData"
                        :options="chartOptions"
                        :plugins="[ChartDataLabels]"
                        :key="theme"
                    />
                </div>
            </div>
        </template>
        <template #footer>
            <div v-if="false" class="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                <label class="font-semibold mr-2 mb-0">{{ t('stats.chart.rareDropRanking.rarity') }}:</label>
                <ul class="flex items-center flex-wrap gap-2">
                    <li v-for="(count, rarity) in raritySummary" :key="rarity" class="flex items-center text-sm">
                        <span class="mr-2">{{ rarity }}</span>
                        <span class="font-semibold text-primary-600 dark:text-primary-500">({{ count.toLocaleString() }})</span>
                    </li>
                </ul>
            </div>

            <div class="flex items-center gap-1 mt-4 max-w-full md:max-w-[440px]" v-tooltip.bottom="showTooltip()">
                <i class="pi pi-info-circle text-sm text-blue-600 dark:text-blue-500"></i>
                <div class="text-xs text-blue-600 dark:text-blue-500">
                    {{ t('stats.chart.rareDropRanking.notice') }}
                </div>
            </div>
        </template>
    </Card>
</template>

