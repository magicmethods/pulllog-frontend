import { useToast } from "primevue/usetoast"
import { nextTick, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { endpoints } from "~/api/endpoints"
import { useAPI } from "~/composables/useAPI"
import { useConfig } from "~/composables/useConfig"
import { useFeatureFlag } from "~/composables/useFeatureFlag"

/** 永続化に利用する localStorage のキー */
const STORAGE_KEY = "pulllog.statsLayout.v1"
const SYNC_FLAG: FeatureFlagName = "StatsLayoutSync"

const VALID_SIZES: StatsTileSize[] = [
    "span-2",
    "span-3",
    "span-4",
    "span-5",
    "span-6",
]
const LEGACY_SIZE_MAP: Record<string, StatsTileSize> = {
    small: "span-2",
    medium: "span-4",
    large: "span-6",
}

const DEFAULT_STATS_LAYOUT: StatsLayoutState = {
    version: "v1",
    tiles: [
        { id: "expense-ratio", size: "span-2", visible: true },
        { id: "monthly-expense", size: "span-4", visible: true },
        { id: "cumulative-rare-rate", size: "span-6", visible: true },
        { id: "app-pull-stats", size: "span-2", visible: true },
        { id: "rare-breakdown", size: "span-2", visible: true },
        { id: "rare-ranking", size: "span-2", visible: true },
    ],
}

const KNOWN_TILE_IDS = new Set<StatsTileId>(
    DEFAULT_STATS_LAYOUT.tiles.map((tile) => tile.id),
)

export const useStatsLayoutStore = defineStore("statsLayout", () => {
    const tiles = ref<StatsTileConfig[]>(cloneTiles(DEFAULT_STATS_LAYOUT.tiles))
    const isInitialized = ref<boolean>(false)
    const isSyncing = ref<boolean>(false)
    const lastSyncedState = ref<StatsLayoutState>(
        cloneState(DEFAULT_STATS_LAYOUT),
    )
    const pendingSyncState = ref<StatsLayoutState | null>(null)

    const toast = useToast()
    const { t } = useI18n()
    const { callApi } = useAPI()
    const featureFlag = useFeatureFlag()
    const config = useConfig()

    let syncTimer: number | null = null
    let isApplyingSnapshot = false

    /**
     * 現在のタイル配列から状態スナップショットを生成する。
     */
    function snapshot(): StatsLayoutState {
        return {
            version: "v1",
            tiles: cloneTiles(tiles.value),
        }
    }

    /**
     * 指定した状態を現在のストアに適用する。
     */
    async function applyState(state: StatsLayoutState): Promise<void> {
        isApplyingSnapshot = true
        tiles.value = cloneTiles(state.tiles)
        await nextTick()
        isApplyingSnapshot = false
    }

    /**
     * localStorage から保存済みのレイアウトを読み込む。
     */
    function loadFromStorage(): StatsLayoutState | null {
        if (!import.meta.client) return null
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        try {
            const parsed = JSON.parse(raw) as unknown
            return normalizeState(parsed)
        } catch {
            return null
        }
    }

    /**
     * 現在のレイアウトを localStorage に保存する。
     */
    function saveToStorage(state: StatsLayoutState): void {
        if (!import.meta.client) return
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }

    /**
     * API からレイアウトを取得する。
     */
    async function fetchRemoteState(): Promise<StatsLayoutState | null> {
        try {
            const response = await callApi<{
                layout: StatsTileConfig[]
                version?: StatsLayoutVersion
            } | null>({
                endpoint: endpoints.userFilters.get("stats"),
                method: "GET",
            })
            if (!response || !response.layout) return null
            return normalizeState({
                version: response.version ?? "v1",
                tiles: response.layout,
            })
        } catch (_error) {
            showLoadError()
            return null
        }
    }

    /**
     * API へレイアウトを同期する。
     */
    async function pushRemoteState(state: StatsLayoutState): Promise<void> {
        if (!featureFlag.isActive(SYNC_FLAG)) return
        if (!import.meta.client) return
        if (isSyncing.value) return

        isSyncing.value = true
        pendingSyncState.value = cloneState(state)
        try {
            await callApi({
                endpoint: endpoints.userFilters.update("stats"),
                method: "PUT",
                data: {
                    version: state.version,
                    layout: state.tiles,
                },
            })
            lastSyncedState.value = cloneState(state)
            pendingSyncState.value = null
        } catch (_error) {
            pendingSyncState.value = null
            await applyState(lastSyncedState.value)
            saveToStorage(lastSyncedState.value)
            showSaveError()
        } finally {
            isSyncing.value = false
        }
    }

    /**
     * 同期処理をデバウンスする。
     */
    function scheduleSync(state: StatsLayoutState): void {
        if (!featureFlag.isActive(SYNC_FLAG)) return
        if (!import.meta.client) return
        if (syncTimer) {
            window.clearTimeout(syncTimer)
        }
        syncTimer = window.setTimeout(() => {
            void pushRemoteState(state)
        }, 500)
    }

    /**
     * 初期化処理。localStorage → API → デフォルトの順に適用する。
     */
    async function initialize(): Promise<void> {
        if (isInitialized.value) return
        const localState = loadFromStorage()
        if (localState) {
            await applyState(localState)
            lastSyncedState.value = cloneState(localState)
        } else {
            await applyState(DEFAULT_STATS_LAYOUT)
            lastSyncedState.value = cloneState(DEFAULT_STATS_LAYOUT)
            saveToStorage(DEFAULT_STATS_LAYOUT)
        }

        if (featureFlag.isActive(SYNC_FLAG)) {
            const remoteState = await fetchRemoteState()
            if (remoteState) {
                await applyState(remoteState)
                lastSyncedState.value = cloneState(remoteState)
                saveToStorage(remoteState)
            }
        }

        isInitialized.value = true
    }

    /**
     * タイルのサイズを更新する。
     */
    function setSize(id: StatsTileId, size: StatsTileSize): void {
        const tile = tiles.value.find((item) => item.id === id)
        if (!tile) return
        tile.size = size
    }

    /**
     * タイルの可視状態を更新する。
     */
    function setVisible(id: StatsTileId, visible: boolean): void {
        const tile = tiles.value.find((item) => item.id === id)
        if (!tile) return
        tile.visible = visible
    }

    /**
     * タイルの並び順を更新する。欠損分は末尾に追加される。
     */
    function setOrder(order: StatsTileId[]): void {
        const currentMap = new Map<StatsTileId, StatsTileConfig>()
        for (const tile of tiles.value) {
            currentMap.set(tile.id, { ...tile })
        }
        const reordered: StatsTileConfig[] = []
        for (const id of order) {
            const nextTile = currentMap.get(id)
            if (!nextTile) continue
            reordered.push(nextTile)
            currentMap.delete(id)
        }
        for (const [, tile] of currentMap) {
            reordered.push(tile)
        }
        tiles.value = reordered
    }

    /**
     * レイアウトをデフォルトにリセットする。
     */
    async function reset(): Promise<void> {
        await applyState(DEFAULT_STATS_LAYOUT)
        lastSyncedState.value = cloneState(DEFAULT_STATS_LAYOUT)
        saveToStorage(DEFAULT_STATS_LAYOUT)
        if (featureFlag.isActive(SYNC_FLAG)) {
            scheduleSync(snapshot())
        }
    }

    function showLoadError(): void {
        toast.add({
            severity: "error",
            summary: t("stats.layout.toast.loadFailed"),
            detail: config.isDebug
                ? "Failed to load layout configuration"
                : undefined,
            life: 4000,
        })
    }

    function showSaveError(): void {
        toast.add({
            severity: "error",
            summary: t("stats.layout.toast.saveFailed"),
            detail: config.isDebug
                ? "Failed to save layout configuration"
                : undefined,
            life: 4000,
        })
    }

    watch(
        tiles,
        (next) => {
            if (!isInitialized.value || isApplyingSnapshot) return
            const state: StatsLayoutState = {
                version: "v1" as StatsLayoutVersion,
                tiles: cloneTiles(next),
            }
            saveToStorage(state)
            scheduleSync(state)
        },
        { deep: true },
    )

    return {
        tiles,
        isInitialized,
        isSyncing,
        initialize,
        setSize,
        setVisible,
        setOrder,
        reset,
    }
})

/**
 * 任意の入力を StatsLayoutState に正規化する。
 */
function normalizeState(input: unknown): StatsLayoutState {
    if (!input || typeof input !== "object")
        return cloneState(DEFAULT_STATS_LAYOUT)
    const candidate = input as {
        version?: unknown
        tiles?: unknown
    }
    const version: StatsLayoutVersion = "v1"
    const tiles = Array.isArray(candidate.tiles)
        ? sanitizeTiles(candidate.tiles)
        : cloneTiles(DEFAULT_STATS_LAYOUT.tiles)
    return {
        version,
        tiles,
    }
}

function sanitizeTiles(list: unknown[]): StatsTileConfig[] {
    const result: StatsTileConfig[] = []
    const seen = new Set<StatsTileId>()
    for (const item of list) {
        const tile = sanitizeTile(item)
        if (!tile) continue
        if (seen.has(tile.id)) continue
        result.push(tile)
        seen.add(tile.id)
    }
    for (const tile of DEFAULT_STATS_LAYOUT.tiles) {
        if (seen.has(tile.id)) continue
        result.push({ ...tile })
    }
    return result
}

function sanitizeTile(candidate: unknown): StatsTileConfig | null {
    if (!candidate || typeof candidate !== "object") return null
    const record = candidate as {
        id?: unknown
        size?: unknown
        visible?: unknown
        locked?: unknown
    }
    if (typeof record.id !== "string") return null
    const id = record.id as StatsTileId
    if (!KNOWN_TILE_IDS.has(id)) return null
    const defaultTile = DEFAULT_STATS_LAYOUT.tiles.find(
        (tile) => tile.id === id,
    )
    if (!defaultTile) return null
    const size = normalizeSize(record.size, defaultTile.size)
    const visible =
        typeof record.visible === "boolean"
            ? record.visible
            : defaultTile.visible
    const locked =
        typeof record.locked === "boolean" ? record.locked : defaultTile.locked
    return {
        id,
        size,
        visible,
        locked,
    }
}

function normalizeSize(value: unknown, fallback: StatsTileSize): StatsTileSize {
    if (typeof value === "string") {
        if (isValidSize(value)) {
            return value
        }
        if (value in LEGACY_SIZE_MAP) {
            return LEGACY_SIZE_MAP[value as keyof typeof LEGACY_SIZE_MAP]
        }
    }
    return fallback
}

function isValidSize(value: unknown): value is StatsTileSize {
    return (
        typeof value === "string" &&
        VALID_SIZES.includes(value as StatsTileSize)
    )
}

function cloneTiles(source: StatsTileConfig[]): StatsTileConfig[] {
    return source.map((tile) => ({ ...tile }))
}

function cloneState(state: StatsLayoutState): StatsLayoutState {
    return {
        version: state.version,
        tiles: cloneTiles(state.tiles),
    }
}
