/**
 * Statistics layout shared types
 */
declare global {
    type StatsLayoutVersion = "v1"

    type StatsLayoutContext = "stats" | "apps" | "history" | "gallery"

    type StatsLayoutFilters = Record<string, unknown>

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
        order?: number
    }

    interface StatsLayoutState {
        version: StatsLayoutVersion
        tiles: StatsTileConfig[]
        filters: StatsLayoutFilters
    }

    interface StatsLayoutRemoteMeta {
        context: StatsLayoutContext
        created: boolean
        updatedAt: string | null
    }

    interface StatsLayoutServerState extends StatsLayoutState {
        context: StatsLayoutContext
        created: boolean
        updatedAt: string | null
    }

    interface StatsLayoutConflictPayload {
        message?: string
        latestVersion?: StatsLayoutVersion
        payload?: Partial<StatsLayoutServerState>
    }
}
export {}
