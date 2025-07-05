import { useUserStore } from '~/stores/useUserStore'
import { StorageUtil } from '~/utils/storage'

/** テーマごとのプリセットカラー（現在10色だが必要に応じて増減可） */
export const PRESET_CHART_COLORS: Record<'light' | 'dark', ChartColor[]> = {
    light: [
        { bg: 'oklch(60.6% 0.25 292.717)',   hover: 'oklch(66.6% 0.22 292.717 / .7)', border: 'oklch(75% 0.23 292.717)', annotation: 'oklch(50.6% 0.23 292.717)' }, // violet
        { bg: 'oklch(76.9% 0.188 70.08)',    hover: 'oklch(81% 0.18 70.08 / .7)',   border: 'oklch(82.8% 0.189 84.429)', annotation: 'oklch(66.9% 0.189 84.429)' }, // amber
        { bg: 'oklch(74% 0.238 322.16)',     hover: 'oklch(80% 0.21 322.16 / .7)',  border: 'oklch(83% 0.19 322.16)',    annotation: 'oklch(64% 0.19 322.16)' },  // fuchsia
        { bg: 'oklch(62% 0.20 150)',         hover: 'oklch(67% 0.20 150 / .7)',     border: 'oklch(74% 0.15 150)',       annotation: 'oklch(52% 0.15 150)' },     // green
        { bg: 'oklch(70.4% 0.22 40)',        hover: 'oklch(76% 0.19 40 / .7)',      border: 'oklch(85% 0.12 40)',        annotation: 'oklch(60.4% 0.12 40)' },      // yellow
        { bg: 'oklch(55% 0.20 20)',          hover: 'oklch(61% 0.18 20 / .7)',      border: 'oklch(66% 0.13 20)',        annotation: 'oklch(45% 0.13 20)' },      // brown
        { bg: 'oklch(65% 0.22 260)',         hover: 'oklch(70% 0.21 260 / .7)',     border: 'oklch(75% 0.15 260)',       annotation: 'oklch(55% 0.15 260)' },     // blue
        { bg: 'oklch(52% 0.18 180)',         hover: 'oklch(57% 0.16 180 / .7)',     border: 'oklch(61% 0.11 180)',       annotation: 'oklch(42% 0.11 180)' },     // teal
        { bg: 'oklch(60% 0.19 20)',          hover: 'oklch(65% 0.17 20 / .7)',      border: 'oklch(71% 0.10 20)',        annotation: 'oklch(50% 0.10 20)' },      // orange
        { bg: 'oklch(84% 0.08 250)',         hover: 'oklch(88% 0.07 250 / .7)',     border: 'oklch(92% 0.04 250)',       annotation: 'oklch(74% 0.04 250)' },     // gray
    ],
    dark: [
        { bg: 'oklch(54.1% 0.281 293.009)',  hover: 'oklch(60% 0.22 293.009 / .6)', border: 'oklch(68% 0.18 293.009)',   annotation: 'oklch(64.1% 0.18 293.009 / .8)' }, // violet
        { bg: 'oklch(79.5% 0.184 86.047)',   hover: 'oklch(85% 0.18 86.047 / .6)',  border: 'oklch(90% 0.17 86.047)',    annotation: 'oklch(89.5% 0.17 86.047 / .8)' },  // yellow
        { bg: 'oklch(71.8% 0.202 349.761)',  hover: 'oklch(77% 0.19 349.761 / .6)', border: 'oklch(83% 0.13 349.761)',   annotation: 'oklch(81.8% 0.13 349.761 / .8)' }, // pink
        { bg: 'oklch(57% 0.15 170)',         hover: 'oklch(62% 0.14 170 / .6)',     border: 'oklch(68% 0.10 170)',       annotation: 'oklch(67% 0.10 170 / .8)' },     // green
        { bg: 'oklch(68% 0.14 60)',          hover: 'oklch(73% 0.12 60 / .6)',      border: 'oklch(80% 0.07 60)',        annotation: 'oklch(78% 0.07 60 / .8)' },      // yellow
        { bg: 'oklch(49% 0.11 30)',          hover: 'oklch(55% 0.09 30 / .6)',      border: 'oklch(60% 0.06 30)',        annotation: 'oklch(59% 0.06 30 / .8)' },      // brown
        { bg: 'oklch(56% 0.15 260)',         hover: 'oklch(62% 0.13 260 / .6)',     border: 'oklch(70% 0.09 260)',       annotation: 'oklch(66% 0.09 260 / .8)' },     // blue
        { bg: 'oklch(45% 0.13 180)',         hover: 'oklch(52% 0.11 180 / .6)',     border: 'oklch(57% 0.07 180)',       annotation: 'oklch(55% 0.07 180 / .8)' },     // teal
        { bg: 'oklch(53% 0.13 40)',          hover: 'oklch(59% 0.10 40 / .6)',      border: 'oklch(67% 0.06 40)',        annotation: 'oklch(63% 0.06 40 / .8)' },      // orange
        { bg: 'oklch(77% 0.04 250)',         hover: 'oklch(80% 0.03 250 / .6)',     border: 'oklch(88% 0.02 250)',       annotation: 'oklch(87% 0.02 250 / .8)' },     // gray
    ]
}

/** テーマごとのデフォルトカラーパレット */
const defaultPalettes: Record<Theme, ChartPalette> = {
    light: {
        rare: 'oklch(76.9% 0.188 70.08)', // amber-500
        other: 'oklch(60.6% 0.25 292.717)', // violet-500
        expense: 'oklch(74% 0.238 322.16 / .5)', // fuchsia-400/50
        bg: 'oklch(100% 0 0)', // white
        text: 'oklch(27.9% 0.041 260.031)', // surface-800 (slate-800)
        grid: 'oklch(92.9% 0.013 255.508)', // surface-200 (slate-200)
        axis: 'oklch(70.4% 0.04 256.788)', // surface-400 (slate-400)
        legend: 'oklch(27.9% 0.041 260.031)', // surface-800 (slate-800)
        tooltipBg: 'oklch(100% 0 0)', // white
        tooltipText: 'oklch(27.9% 0.041 260.031)', // surface-800 (slate-800)
        tooltipBorder: 'oklch(92.9% 0.013 255.508)', // surface-200 (slate-200)
        annotationBorder: 'oklch(70.4% 0.04 256.788)', // surface-400 (slate-400)
        annotationText: 'oklch(27.9% 0.041 260.031)', // surface-800 (slate-800)
        annotationBg: 'oklch(99.9% 0.001 0.001 / .86)', // white/50
    },
    dark: {
        rare: 'oklch(79.5% 0.184 86.047)', // yellow-500
        other: 'oklch(54.1% 0.281 293.009)', // violet-600
        expense: 'oklch(71.8% 0.202 349.761 / .6)', // pink-400/60
        bg: 'oklch(21% 0.034 264.665)', // gray-900
        text: 'oklch(92.8% 0.006 264.531)', // gray-200
        grid: 'oklch(37.3% 0.034 259.733)', // gray-700
        axis: 'oklch(70.7% 0.022 261.325)', // gray-400
        legend: 'oklch(92.8% 0.006 264.531)', // gray-200
        tooltipBg: 'oklch(21% 0.034 264.665)', // gray-900
        tooltipText: 'oklch(92.8% 0.006 264.531)', // gray-200
        tooltipBorder: 'oklch(37.3% 0.034 259.733)', // gray-700
        annotationBorder: 'oklch(70.7% 0.022 261.325)', // gray-400
        annotationText: 'oklch(92.8% 0.006 264.531)', // gray-200
        annotationBg: 'oklch(21% 0.034 264.665 / .75)', // gray-900/75
    }
}

/**
 * グラフ制御用コンポーザブル
 * - theme: オーバーライド優先度 = props > ローカルストレージ > ユーザー設定 > システム
 * - customPalette: オーバーライドしたい部分のみ定義
 * @param customPalettes - カスタムパレットの部分的な定義
 */
export function useChartPalette(customPalettes?: Partial<Record<Theme, Partial<ChartPalette>>>) {
    const userStore = useUserStore()
    const storage = new StorageUtil()
    const theme = ref<Theme>('light') // 初期値はlight

    // テーマ判定
    function updateTheme() {
        const saved = storage.getItem('theme')
        if (saved === 'dark' || saved === 'light') {
            theme.value = saved
        } else if (userStore.user?.theme) {
            theme.value = userStore.user.theme as Theme
        } else {
            // システムダーク判定（未設定時はlight）
            theme.value = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        }
    }

    // パレット取得
    const palette = computed<ChartPalette>(() => {
        const t = theme.value
        return {
            ...defaultPalettes[t],
            ...(customPalettes?.[t] || {}) as ChartPalette,
        }
    })

    // プリセット取得
    const presetColors = computed<ChartColor[]>(() => {
        return PRESET_CHART_COLORS[theme.value]
    })

    onMounted(() => {
        updateTheme()
        // ウィンドウのテーマ変更イベントを監視
        window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', updateTheme)
    })
    onUnmounted(() => {
        // イベントリスナーを削除
        window.matchMedia?.('(prefers-color-scheme: dark)').removeEventListener('change', updateTheme)
    })

    watch(
        () => userStore.user?.theme,
        async () => {
            await nextTick()
            theme.value = (userStore.user?.theme ?? 'light') as Theme
        }
    )

    return {
        theme,
        palette,
        presetColors,
        updateTheme,
    }
}
