// Types
export type TileSpan = 1 | 2 | 3 | 4 | 5 | 6
export type TileId =
    | "expense-ratio"
    | "monthly-expense"
    | "cumulative-rare-rate"
    | "app-pull-stats"
    | "rare-breakdown"
    | "rare-ranking"

export type TileConfig = {
    id: TileId
    span: TileSpan
    visible: boolean
}

export const useStatsLayoutStore = defineStore("statsLayout", () => {
    // デフォルト定義:
    // - 小カード(凡例付円グラフなど): 2 or 3
    // - 中カード(棒/集計): 4
    // - 大カード(長尺ライン/ランキング): 6
    const tiles = ref<TileConfig[]>([
        { id: "expense-ratio", span: 2, visible: true }, // 小
        { id: "monthly-expense", span: 4, visible: true }, // 中
        { id: "cumulative-rare-rate", span: 6, visible: true }, // 大
        { id: "app-pull-stats", span: 2, visible: true }, // 小～中
        { id: "rare-breakdown", span: 2, visible: true }, // 小
        { id: "rare-ranking", span: 2, visible: true }, // 小～中
    ])

    function setSpan(id: TileId, span: TileSpan) {
        const t = tiles.value.find((v) => v.id === id)
        if (t) t.span = span
    }

    function setVisible(id: TileId, visible: boolean) {
        const t = tiles.value.find((v) => v.id === id)
        if (t) t.visible = visible
    }

    function setOrder(next: TileId[]) {
        const map = new Map(tiles.value.map((t) => [t.id, t]))
        tiles.value = next
            .map((id) => map.get(id))
            .filter((t): t is TileConfig => !!t)
    }

    return {
        tiles,
        setSpan,
        setVisible,
        setOrder,
    }
})
