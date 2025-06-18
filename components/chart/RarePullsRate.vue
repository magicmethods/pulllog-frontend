<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'

// Props
const props = defineProps<{
    data: StatsData
    colors?: string | string[]
    centerText?: string // 中央表示（主にdoughnut用）
    width?: number
    height?: number
}>()

// Stores
const userStore = useUserStore()

// 色設定
const palette = computed(() => userStore.user?.theme === 'dark'
    ? {
        rare: 'oklch(79.5% 0.184 86.047)', // yellow-500
        other: 'oklch(54.1% 0.281 293.009 / .75)',
        hoverRare: 'oklch(68.1% 0.162 75.834)', // yellow-600
        hoverOther: 'oklch(54.1% 0.281 293.009 / .6)',
        borderRare: 'oklch(85.2% 0.199 91.936)', // yellow-400 <- 'oklch(71.8% 0.202 349.761 / .6)',
        borderOther: 'transparent',
        bg: 'oklch(21% 0.034 264.665)', text: 'oklch(92.8% 0.006 264.531)',
        //grid: 'oklch(37.3% 0.034 259.733)', axis: 'oklch(70.7% 0.022 261.325)',
        legend: 'oklch(92.8% 0.006 264.531)',
        tooltipBg: 'oklch(21% 0.034 264.665)', tooltipText: 'oklch(92.8% 0.006 264.531)', tooltipBorder: 'oklch(37.3% 0.034 259.733)'
    }
    : {
        rare: 'oklch(76.9% 0.188 70.08)', // amber-500
        other: 'oklch(60.6% 0.25 292.717 / .75)',
        hoverRare: 'oklch(66.6% 0.179 58.318 / .6)', // amber-600/60
        hoverOther: 'oklch(60.6% 0.25 292.717 / .6)',
        borderRare: 'oklch(82.8% 0.189 84.429)', // amber-400 <- 'oklch(74% 0.238 322.16 / .1)',
        borderOther: 'transparent',
        bg: '#fff', text: 'oklch(27.9% 0.041 260.031)',
        //grid: 'oklch(92.9% 0.013 255.508)', axis: 'oklch(70.4% 0.04 256.788)',
        legend: 'oklch(27.9% 0.041 260.031)',
        tooltipBg: '#fff', tooltipText: 'oklch(27.9% 0.041 260.031)', tooltipBorder: 'oklch(92.9% 0.013 255.508)'
    }
)
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
