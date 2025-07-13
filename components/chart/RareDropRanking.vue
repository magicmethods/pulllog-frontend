<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useUserStore } from '~/stores/useUserStore'
import { useOptionStore } from '~/stores/useOptionStore'
import { useChartPalette } from '~/composables/useChart'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import type { ChartDataset } from 'chart.js'
import { stripEmoji } from '~/utils/string'

// Stores etc.
const userStore = useUserStore()
const optionStore = useOptionStore()
const { t, locale } = useI18n()

const SYSTEM_OTHER_KEY = computed(() => optionStore.otherPlaceholder)
const PRESET_MARKER_LABELS = ['pickup', 'lose', 'target', 'guaranteed', 'other'] as const
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
/*
const locale = computed(() => 
    userStore.user?.language === 'ja' ? 'ja-JP' : 'en-US' // ユーザの言語設定
)
*/
// ラベルマップ
const labelMap = computed<Record<MarkerKey, string>>(() => ({
    pickup: t('stats.chart.rareDropRanking.pickup'),
    lose: t('stats.chart.rareDropRanking.lose'),
    target: t('stats.chart.rareDropRanking.target'),
    guaranteed: t('stats.chart.rareDropRanking.guaranteed'),
    other: t('stats.chart.rareDropRanking.other')
}))
const otherLabel = computed(() => t('stats.chart.rareDropRanking.other'))
// 色マップ
const colorMap = computed<ColorMap>(() => {
    const map: ColorMap = {}
    const preset = presetColors.value
    ;(PRESET_MARKER_LABELS).forEach((label: MarkerKey, i: number) => {
        map[label] = props.colors?.[label] ?? preset[i % preset.length]
    })
    return map
})
// 対象アプリのデータを抽出
const ranking = computed(() => props.data.find(d => d.appId === props.appId))
// アイテム名一覧（カウント降順→アルファベット順→五十音順）
const sortedNames = computed(() => {
    if (!ranking.value) return []
    // rarityName: { "rarity|name": count }
    // name: { "itemName": count }
    const itemArr = Object.entries(ranking.value.items.name)

    // システム「その他」を抽出
    const etcIdx = itemArr.findIndex(([name]) => name === SYSTEM_OTHER_KEY.value)
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
        label: `${name} (${count})`
    }))

    // システム「その他」をラベル変換して末尾に追加
    if (etcEntry) {
        mapped.push({
            name: SYSTEM_OTHER_KEY.value,
            label: `${otherLabel.value} (${etcEntry[1]})`
        })
    }
    console.log('Sorted Names:', mapped, SYSTEM_OTHER_KEY.value)

    // maxRank対応
    if (props.maxRank && props.maxRank > 0) {
        return mapped.slice(0, props.maxRank)/* .map(([name, count]) => ({
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
        let [rarity, name] = key.split('|')
        rarity = rarity.trim()
        name = stripEmoji(name).trim()
        const label = rarity !== '' ? rarity : 'rare'
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

// マーカー・パース＋合計
const markerKeys = computed(() => {
    if (!ranking.value) return {}
    // markerName: { "name|marker": count }
    const map: Record<string, Partial<Record<MarkerKey, number>>> = {}
    for (const [key, value] of Object.entries(ranking.value.items.markerName)) {
        let [name, marker] = key.split('|')
        name = stripEmoji(name).trim()
        marker = stripEmoji(marker).trim()
        let label: MarkerKey = 'other'
        if (/(ピックアップ|pickup)/g.test(marker)) label = 'pickup'
        else if (/(すり(抜|ぬ)け|lose\s?(the\s?)?(50(\/|\-)50))/g.test(marker)) label = 'lose'
        else if (/((狙|ねら)い|target)/g.test(marker)) label = 'target'
        else if (/((確定|かくてい)(枠|)|guaranteed)/g.test(marker)) label = 'guaranteed'
        // それ以外はother
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
        const markerSum = Object.values(markerKeys.value[name] ?? {}).reduce((a, b) => a + (b ?? 0), 0)
        const nameCount = ranking.value.items.name[name] ?? 0
        res[name] = Math.max(markerSum, nameCount)
    }
    return res // { "itemName": maxValue }
})

// Stack Barデータを生成
const chartData = computed(() => {
    if (!ranking.value) return { labels: [], datasets: [] }
    //const labels = sortedNames.value
    const labels = sortedNames.value.map(item => item.label) // アイテム名のラベル

    // markerのスタックBar
    const datasets: ChartDataset[] = PRESET_MARKER_LABELS.map((marker, i) => ({
        label: labelMap.value[marker],
        data: sortedNames.value.map(item => markerKeys.value[item.name]?.[marker] ?? 0),
        backgroundColor: props.colors?.[marker]?.bg ?? colorMap.value[marker].bg,
        hoverBackgroundColor: props.colors?.[marker]?.hover ?? colorMap.value[marker].hover,
        borderColor: props.colors?.[marker]?.border ?? colorMap.value[marker].border,
        borderWidth: 1,
        stack: 'marker',
    })).filter(ds => ds.data.some(v => v > 0)) // データが0のものは除外
    // "その他" スタック：合計未満の差分
    datasets.push({
        label: labelMap.value.other,
        data: sortedNames.value.map(item => {
            const stackedSum = PRESET_MARKER_LABELS.reduce((sum, marker) => sum + (markerKeys.value[item.name]?.[marker] ?? 0), 0)
            return Math.max(0, (maxCounts.value[item.name] ?? 0) - stackedSum)
        }),
        backgroundColor: props.colors?.other?.bg ?? colorMap.value.other.bg,
        hoverBackgroundColor: props.colors?.other?.hover ?? colorMap.value.other.hover,
        borderColor: props.colors?.other?.border ?? colorMap.value.other.border,
        borderWidth: 1,
        stack: 'marker',
    })

    return {
        labels,
        datasets
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
    return Math.ceil(max * 1.1 / step) * step
})

// Chart.jsオプション
const chartOptions = computed(() => ({
    indexAxis: 'y',
    plugins: {
        legend: {
            display: false,
            position: 'bottom',
        },
        datalabels: {
            display: (ctx: ContextModel) => ctx.dataset.data[ctx.dataIndex] > 0,
            align: 'center',
            anchor: 'center',
            color: 'oklch(100% 0 0)', // white
            font: { weight: 'bold' },
            formatter: (value: number) => value > 0 ? value : '',
        },
        tooltip: {
            enabled: true,
            backgroundColor: palette.value.tooltipBg, // ツールチップ背景
            titleColor: palette.value.tooltipText, // タイトル文字色
            bodyColor: palette.value.tooltipText, // 本文文字色
            borderColor: palette.value.tooltipBorder, // ボーダー色
            borderWidth: 1,
            callbacks: {
                label: (ctx: ContextModel) => `${ctx.dataset.label}: ${ctx.parsed.x}`
            }
        }
    },
    scales: {
        x: {
            position: 'top',
            min: 0,
            max: maxValue.value,
            title: { display: false, text: t('stats.chart.rareDropRanking.count') },
            ticks: { color: palette.value.text, stepSize: calcStepSize(maxValue.value) },
            border: { color: palette.value.axis }
        },
        x2: {
            position: 'bottom',
            min: 0,
            max: maxValue.value,
            title: { display: false, text: t('stats.chart.rareDropRanking.count') },
            ticks: { color: palette.value.text, stepSize: calcStepSize(maxValue.value) },
            border: { color: palette.value.axis }
        },
        y: {
            title: { display: false, text: t('stats.chart.rareDropRanking.itemName') },
            grid: { color: palette.value.grid },
            ticks: { color: palette.value.text },
            border: { color: palette.value.axis },
        }
    },
    responsive: true,
    maintainAspectRatio: false
}))


</script>

<template>
    <Card class="max-h-[20rem] w-full md:max-w-2/3 md:flex-grow" style="width: stretch;">
        <template #title>
            <h3 class="text-base">
                <span class="text-primary-800 dark:text-primary-400 mx-0.5">
                    {{ t('stats.chart.rareDropRanking.title', { appName: strBytesTruncate(ranking?.appName ?? '', 7, 80) }) }}
                </span>
            </h3>
        </template>
        <template #content>
            <div class="h-[12rem] overflow-y-auto">
                <div class="relative min-h-max w-full" :style="{ height: sortedNames.length * 2 + 'rem' }">
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
            <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ t('stats.chart.rareDropRanking.note') }}
            </span>
        </template>
    </Card>
</template>
