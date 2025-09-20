/**
 * Statistics layout shared types
 */
declare global {
    type StatsLayoutVersion = "v1"

    type StatsTileId =
        | "expense-ratio"
        | "monthly-expense"
        | "cumulative-rare-rate"
        | "app-pull-stats"
        | "rare-breakdown"
        | "rare-ranking"

    type StatsTileSize = "span-2" | "span-3" | "span-4" | "span-5" | "span-6"

    interface StatsTileConfig {
        id: StatsTileId
        size: StatsTileSize
        visible: boolean
        locked?: boolean
    }

    interface StatsLayoutState {
        version: StatsLayoutVersion
        tiles: StatsTileConfig[]
    }
}
export {}
