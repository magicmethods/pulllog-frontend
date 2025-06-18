import { useUserStore } from '~/stores/useUserStore'
import { StorageUtil } from '~/utils/storage'

/** テーマごとのデフォルトカラーパレット */
const defaultPalettes: Record<Theme, ChartPalette> = {
    light: {
        rare: 'oklch(76.9% 0.188 70.08)', // amber-500
        other: 'oklch(60.6% 0.25 292.717)', // violet-500
        expense: 'oklch(74% 0.238 322.16 / .5)', // fuchsia-400/50
        bg: '#fff', // white
        text: 'oklch(27.9% 0.041 260.031)', // surface-800 (slate-800)
        grid: 'oklch(92.9% 0.013 255.508)', // surface-200 (slate-200)
        axis: 'oklch(70.4% 0.04 256.788)', // surface-400 (slate-400)
        legend: 'oklch(27.9% 0.041 260.031)', // surface-800 (slate-800)
        tooltipBg: '#fff', // white
        tooltipText: 'oklch(27.9% 0.041 260.031)', // surface-800 (slate-800)
        tooltipBorder: 'oklch(92.9% 0.013 255.508)' // surface-200 (slate-200)
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
        tooltipBorder: 'oklch(37.3% 0.034 259.733)' // gray-700
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

    // テーマ判定
    const theme = computed<Theme>(() => {
        const saved = storage.getItem('theme')
        if (saved === 'dark' || saved === 'light') return saved
        if (userStore.user?.theme) return userStore.user.theme as Theme
        // システムダーク判定（未設定時はlight）
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    })

    // パレット取得
    const palette = computed<ChartPalette>(() => {
        const t = theme.value
        return {
            ...defaultPalettes[t],
            ...(customPalettes?.[t] || {}) as ChartPalette,
        }
    })

    return {
        theme,
        palette
    }
}
