<script setup lang="ts">
import { useChartPalette } from '~/composables/useChart'

// Props
const props = defineProps<{
    data: StatsData
    colors?: string | string[]
    centerText?: string // 中央表示（主にdoughnut用）
    width?: number
    height?: number
}>()

// Composables
const { palette } = useChartPalette({
    light: {
        other: 'oklch(60.6% 0.25 292.717 / .75)', // violet-500/75
        hoverRare: 'oklch(66.6% 0.179 58.318 / .6)', // amber-600/60
        hoverOther: 'oklch(60.6% 0.25 292.717 / .6)', // violet-500/60
        borderRare: 'oklch(82.8% 0.189 84.429)', // amber-400
        borderOther: 'transparent',
    },
    dark: {
        other: 'oklch(54.1% 0.281 293.009 / .75)', // violet-600/75
        hoverRare: 'oklch(68.1% 0.162 75.834)', // yellow-600
        hoverOther: 'oklch(54.1% 0.281 293.009 / .6)', // violet-600/60
        borderRare: 'oklch(85.2% 0.199 91.936)', // yellow-400
        borderOther: 'transparent',
    },
})

// グラフデータ
const chartData = {
    labels: [
        'レア',
        'その他'
    ],
    datasets: [{
        label: '排出率',
        data: [
            props.data.rareDropRate ?? 0,
            100 - (props.data.rareDropRate ?? 0)
        ],
        backgroundColor: [
            palette.value.rare,
            palette.value.other
        ],
        hoverBackgroundColor: [
            palette.value.hoverRare,
            palette.value.hoverOther
        ],
        borderColor: [
            palette.value.borderRare,
            palette.value.borderOther
        ],
        borderWidth: 1,
        borderAlign: 'center',
        offset: 1,
        hoverOffset: 2,
    }]
}
// グラフオプション
const chartOptions = {
    plugins: {
        legend: { display: false },
        tooltip: {
            enabled: false,
            backgroundColor: palette.value.tooltipBg, // ツールチップ背景
            titleColor: palette.value.tooltipText, // タイトル文字色
            bodyColor: palette.value.tooltipText, // 本文文字色
            borderColor: palette.value.tooltipBorder, // ボーダー色
            borderWidth: 1,
            callbacks: {
                label: (
                    // biome-ignore lint:/suspicious/noExplicitAny
                    ctx: any
                ) => `${ctx.parsed.toFixed(2)}%`
            }
        }
    },
    cutout: '70%',
    circumference: 359,
    rotation: 1,
    responsive: true,
    maintainAspectRatio: false
}

onMounted(() => {
    console.log('RarePullsRate::mounted', props.data)
    // 初期化後に何か処理が必要ならここに記述
})

</script>

<template>
    <div id="rarePullsRateChart" class="relative h-max w-max">
        <CommonChart
            type="doughnut"
            :data="chartData"
            :options="chartOptions"
            :width="96"
            :height="96"
        />
        <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex justify-center items-baseline event-none">
            <span class="font-bold text-lg text-amber-500 dark:text-yellow-500">{{ props.data.rareDropRate ?? 0 }}</span>
            <span class="font-normal text-xs ml-0.5 text-surface-500 dark:text-gray-400">%</span>
        </div>
    </div>
</template>
