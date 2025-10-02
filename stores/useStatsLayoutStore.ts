import { storeToRefs } from "pinia"
import { useToast } from "primevue/usetoast"
import { computed, nextTick, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { endpoints } from "~/api/endpoints"
import { useAPI } from "~/composables/useAPI"
import { useConfig } from "~/composables/useConfig"
import { useFeatureFlag } from "~/composables/useFeatureFlag"
import { useCsrfStore } from "~/stores/useCsrfStore"
import { useUserStore } from "~/stores/useUserStore"
import { ApiError } from "~/utils/error"

/** 永続化に利用する localStorage のベースキー */
const STORAGE_BASE_KEY = "pulllog.statsLayout.v1"
const SYNC_FLAG: FeatureFlagName = "StatsLayoutSync"
const STATS_CONTEXT: StatsLayoutContext = "stats"
const SYNC_DEBOUNCE_MS = 500

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

const RAW_DEFAULT_TILES: StatsTileConfig[] = [
    { id: "expense-ratio", size: "span-2", visible: true },
    { id: "monthly-expense", size: "span-4", visible: true },
    { id: "cumulative-rare-rate", size: "span-6", visible: true },
    { id: "app-pull-stats", size: "span-2", visible: true },
    { id: "rare-breakdown", size: "span-2", visible: true },
    { id: "rare-ranking", size: "span-2", visible: true },
]

const DEFAULT_STATS_LAYOUT: StatsLayoutState = {
    version: "v1",
    tiles: assignSequentialOrder(RAW_DEFAULT_TILES),
    filters: {},
}

const DEFAULT_REMOTE_META: StatsLayoutRemoteMeta = {
    context: STATS_CONTEXT,
    created: false,
    updatedAt: null,
}

const KNOWN_TILE_IDS = new Set<StatsTileId>(
    DEFAULT_STATS_LAYOUT.tiles.map((tile) => tile.id),
)
const TOAST_GROUP = "notices"

export const useStatsLayoutStore = defineStore("statsLayout", () => {
    const tiles = ref<StatsTileConfig[]>(cloneTiles(DEFAULT_STATS_LAYOUT.tiles))
    const filters = ref<StatsLayoutFilters>(
        cloneFilters(DEFAULT_STATS_LAYOUT.filters),
    )
    const isInitialized = ref<boolean>(false)
    const isSyncing = ref<boolean>(false)
    const activeUserId = ref<number | null>(null)
    const remoteMeta = ref<StatsLayoutRemoteMeta>(
        cloneRemoteMeta(DEFAULT_REMOTE_META),
    )
    const lastSyncedState = ref<StatsLayoutState>(
        cloneState(DEFAULT_STATS_LAYOUT),
    )
    const pendingSyncState = ref<StatsLayoutState | null>(null)

    const toast = useToast()
    const { t } = useI18n()
    const { callApi } = useAPI()
    const featureFlag = useFeatureFlag()
    const config = useConfig()
    const userStore = useUserStore()
    const csrfStore = useCsrfStore()
    const { token: csrfToken } = storeToRefs(csrfStore)

    const isDemoUser = computed(() => userStore.hasUserRole("demo"))

    let syncTimer: number | null = null
    let isApplyingSnapshot = false

    function resetStateForUser(userId: number | null): void {
        if (syncTimer) {
            clearTimeout(syncTimer)
            syncTimer = null
        }
        activeUserId.value = userId
        isInitialized.value = false
        isSyncing.value = false
        pendingSyncState.value = null
        lastSyncedState.value = cloneState(DEFAULT_STATS_LAYOUT)
        remoteMeta.value = cloneRemoteMeta(DEFAULT_REMOTE_META)
        tiles.value = cloneTiles(DEFAULT_STATS_LAYOUT.tiles)
        filters.value = cloneFilters(DEFAULT_STATS_LAYOUT.filters)
        if (import.meta.client && userId !== null) {
            window.localStorage.removeItem(STORAGE_BASE_KEY)
        }
    }

    /**
     * 利用可能な CSRF トークンが存在するかを判定する。
     */
    function hasCsrfToken(): boolean {
        return Boolean(csrfToken.value && csrfToken.value.length > 0)
    }

    /**
     * リモート同期が可能な状態か判定する。
     */
    function canSyncRemote(): boolean {
        return (
            import.meta.client &&
            featureFlag.isActive(SYNC_FLAG) &&
            activeUserId.value !== null &&
            hasCsrfToken() &&
            !isDemoUser.value
        )
    }

    /**
     * 現在のストア状態から同期用スナップショットを生成する。
     */
    function snapshot(): StatsLayoutState {
        return cloneState({
            version: "v1",
            tiles: tiles.value,
            filters: filters.value,
        })
    }

    /**
     * 指定した状態を現在のストアに適用する。
     */
    async function applyState(state: StatsLayoutState): Promise<void> {
        isApplyingSnapshot = true
        const nextState = cloneState(state)
        tiles.value = nextState.tiles
        filters.value = nextState.filters
        await nextTick()
        isApplyingSnapshot = false
    }

    /**
     * localStorage から保存済みのレイアウトを読み込む。
     */
    function loadFromStorage(): StatsLayoutState | null {
        if (!import.meta.client) return null
        const keys = storageKeysForLoad(activeUserId.value)
        for (const key of keys) {
            const raw = window.localStorage.getItem(key)
            if (!raw) continue
            try {
                const parsed = JSON.parse(raw) as unknown
                const normalized = normalizeState(parsed)
                if (key !== resolveStorageKey(activeUserId.value)) {
                    window.localStorage.removeItem(key)
                    saveToStorage(normalized)
                }
                return normalized
            } catch {
                window.localStorage.removeItem(key)
            }
        }
        return null
    }

    /**
     * 現在のレイアウトを localStorage に保存する。
     */
    function saveToStorage(state: StatsLayoutState): void {
        if (!import.meta.client) return
        const storageKey = resolveStorageKey(activeUserId.value)
        window.localStorage.setItem(storageKey, JSON.stringify(state))
        if (activeUserId.value !== null) {
            window.localStorage.removeItem(STORAGE_BASE_KEY)
        }
    }

    /**
     * API からレイアウトを取得する。
     */
    async function fetchRemoteState(): Promise<StatsLayoutServerState | null> {
        if (!canSyncRemote()) return null
        try {
            const response = await callApi<unknown>({
                endpoint: endpoints.userFilters.get(STATS_CONTEXT),
                method: "GET",
            })
            if (!response) return null
            return parseServerState(response)
        } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                throw error
            }
            throw error
        }
    }

    /**
     * API へレイアウトを同期する。
     */
    async function pushRemoteState(state: StatsLayoutState): Promise<void> {
        if (!canSyncRemote()) return
        if (isSyncing.value) return

        isSyncing.value = true
        pendingSyncState.value = cloneState(state)
        try {
            const response = await callApi<unknown>({
                endpoint: endpoints.userFilters.update(STATS_CONTEXT),
                method: "PUT",
                data: {
                    version: state.version,
                    layout: state.tiles,
                    filters: state.filters,
                },
            })
            const parsed = response ? parseServerState(response) : null
            if (!parsed) {
                throw new Error("Invalid server response")
            }
            const normalized = cloneState(parsed)
            lastSyncedState.value = normalized
            remoteMeta.value = toRemoteMeta(parsed)
            pendingSyncState.value = null
            saveToStorage(normalized)
        } catch (error) {
            pendingSyncState.value = null
            if (error instanceof ApiError) {
                if (error.status === 409) {
                    await resolveConflict(error.data)
                } else if (error.status === 403) {
                    await applyState(lastSyncedState.value)
                    saveToStorage(lastSyncedState.value)
                    showForbiddenError()
                } else {
                    await applyState(lastSyncedState.value)
                    saveToStorage(lastSyncedState.value)
                    showSaveError()
                }
            } else {
                await applyState(lastSyncedState.value)
                saveToStorage(lastSyncedState.value)
                showSaveError()
            }
        } finally {
            isSyncing.value = false
        }
    }

    /**
     * 同期処理をデバウンスする。
     */
    function scheduleSync(state: StatsLayoutState): void {
        if (!canSyncRemote()) return
        if (syncTimer) {
            window.clearTimeout(syncTimer)
        }
        syncTimer = window.setTimeout(() => {
            void pushRemoteState(state)
        }, SYNC_DEBOUNCE_MS)
    }

    /**
     * バージョン競合レスポンスを処理する。
     */
    async function resolveConflict(raw: unknown): Promise<void> {
        const { latestVersion, serverState } = parseConflictResponse(raw)
        if (serverState) {
            await applyState(serverState)
            const normalized = cloneState(serverState)
            lastSyncedState.value = normalized
            remoteMeta.value = toRemoteMeta(serverState)
            saveToStorage(normalized)
            showConflictWarning(latestVersion)
            return
        }
        await applyState(lastSyncedState.value)
        if (latestVersion) {
            showConflictWarning(latestVersion)
        } else {
            showSaveError()
        }
    }

    /**
     * 初期化処理。localStorage → API → デフォルトの順に適用する。
     */
    async function initialize(userId?: number | null): Promise<void> {
        const normalizedUserId = normalizeUserId(userId)
        if (activeUserId.value !== normalizedUserId) {
            resetStateForUser(normalizedUserId)
        }
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

        if (canSyncRemote()) {
            await syncFromServer()
        } else {
            remoteMeta.value = cloneRemoteMeta(DEFAULT_REMOTE_META)
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
        tiles.value = assignSequentialOrder(reordered)
    }

    /**
     * レイアウトをデフォルトにリセットする。
     */
    async function reset(): Promise<void> {
        await applyState(DEFAULT_STATS_LAYOUT)
        lastSyncedState.value = cloneState(DEFAULT_STATS_LAYOUT)
        saveToStorage(DEFAULT_STATS_LAYOUT)
        if (canSyncRemote()) {
            scheduleSync(snapshot())
        }
    }

    /**
     * フィルター設定を全体置換する。
     */
    function replaceFilters(next: StatsLayoutFilters): void {
        filters.value = cloneFilters(next)
    }

    function showLoadError(detail?: string): void {
        toast.add({
            group: TOAST_GROUP,
            severity: "error",
            summary: t("stats.layout.toast.loadFailed"),
            detail:
                detail ??
                (config.isDebug
                    ? "Failed to load layout configuration"
                    : undefined),
            life: 4000,
        })
    }

    function showSaveError(): void {
        toast.add({
            group: TOAST_GROUP,
            severity: "error",
            summary: t("stats.layout.toast.saveFailed"),
            detail: config.isDebug
                ? "Failed to save layout configuration"
                : undefined,
            life: 4000,
        })
    }

    function showConflictWarning(latestVersion?: StatsLayoutVersion): void {
        toast.add({
            group: TOAST_GROUP,
            severity: "warn",
            summary: t("stats.layout.toast.conflict"),
            detail: latestVersion
                ? t("stats.layout.toast.conflictDetail", {
                      version: latestVersion,
                  })
                : undefined,
            life: 5000,
        })
    }

    function showForbiddenError(): void {
        toast.add({
            group: TOAST_GROUP,
            severity: "warn",
            summary: t("stats.layout.toast.forbidden"),
            life: 5000,
        })
    }

    /**
     * サーバーから最新のレイアウトを取得し、ストアへ反映する。
     */
    async function syncFromServer(): Promise<void> {
        if (!canSyncRemote()) {
            return
        }
        try {
            const remoteState = await fetchRemoteState()
            if (remoteState) {
                await applyState(remoteState)
                lastSyncedState.value = cloneState(remoteState)
                remoteMeta.value = toRemoteMeta(remoteState)
                saveToStorage(remoteState)
            } else {
                remoteMeta.value = cloneRemoteMeta(DEFAULT_REMOTE_META)
            }
        } catch (error) {
            remoteMeta.value = cloneRemoteMeta(DEFAULT_REMOTE_META)
            if (error instanceof ApiError) {
                if (error.status === 403) {
                    showForbiddenError()
                } else if (error.status !== 401) {
                    showLoadError()
                }
            } else {
                showLoadError()
            }
        }
    }

    watch(
        [tiles, filters],
        () => {
            if (!isInitialized.value || isApplyingSnapshot) return
            const state = snapshot()
            saveToStorage(state)
            if (canSyncRemote()) {
                scheduleSync(state)
            }
        },
        { deep: true },
    )

    watch(csrfToken, (next, previous) => {
        if (next && next !== previous && isInitialized.value) {
            void syncFromServer()
        }
    })

    return {
        tiles,
        filters,
        remoteMeta,
        isInitialized,
        isSyncing,
        pendingSyncState,
        initialize,
        setSize,
        setVisible,
        setOrder,
        reset,
        replaceFilters,
    }
})

function resolveStorageKey(userId: number | null): string {
    if (userId === null) return STORAGE_BASE_KEY
    return `${STORAGE_BASE_KEY}.user.${userId}`
}

function storageKeysForLoad(userId: number | null): string[] {
    if (userId === null) return [STORAGE_BASE_KEY]
    return [resolveStorageKey(userId), STORAGE_BASE_KEY]
}

function normalizeUserId(value?: number | null): number | null {
    if (value === null || value === undefined) return null
    if (typeof value === "number" && Number.isFinite(value)) {
        return value
    }
    return null
}

/**
 * 任意の入力を StatsLayoutState に正規化する。
 */
function normalizeState(input: unknown): StatsLayoutState {
    if (!input || typeof input !== "object")
        return cloneState(DEFAULT_STATS_LAYOUT)
    const candidate = input as {
        version?: unknown
        tiles?: unknown
        filters?: unknown
    }
    const version: StatsLayoutVersion = "v1"
    const tiles = Array.isArray(candidate.tiles)
        ? sanitizeTiles(candidate.tiles)
        : cloneTiles(DEFAULT_STATS_LAYOUT.tiles)
    const filters = sanitizeFilters(candidate.filters)
    return {
        version,
        tiles,
        filters,
    }
}

function parseServerState(input: unknown): StatsLayoutServerState | null {
    if (!input || typeof input !== "object") return null
    const record = input as {
        context?: unknown
        version?: unknown
        layout?: unknown
        filters?: unknown
        created?: unknown
        updatedAt?: unknown
    }
    const state = normalizeState({
        version: record.version,
        tiles: record.layout,
        filters: record.filters,
    })
    const context = isStatsLayoutContext(record.context)
        ? record.context
        : STATS_CONTEXT
    const created = typeof record.created === "boolean" ? record.created : false
    const updatedAt =
        typeof record.updatedAt === "string" ? record.updatedAt : null
    return {
        context,
        version: state.version,
        tiles: state.tiles,
        filters: state.filters,
        created,
        updatedAt,
    }
}

function parseConflictResponse(input: unknown): {
    latestVersion?: StatsLayoutVersion
    serverState: StatsLayoutServerState | null
} {
    let source = input
    if (typeof source === "string") {
        try {
            source = JSON.parse(source) as unknown
        } catch {
            return { latestVersion: undefined, serverState: null }
        }
    }
    if (!source || typeof source !== "object") {
        return { latestVersion: undefined, serverState: null }
    }
    const record = source as {
        latestVersion?: unknown
        latest_version?: unknown
        payload?: unknown
    }
    const latestVersionRaw =
        record.latestVersion ?? record.latest_version ?? undefined
    const latestVersion = latestVersionRaw === "v1" ? "v1" : undefined
    const serverState = parseServerState(record.payload)
    return {
        latestVersion,
        serverState,
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
    result.sort(
        (a, b) =>
            (a.order ?? Number.MAX_SAFE_INTEGER) -
            (b.order ?? Number.MAX_SAFE_INTEGER),
    )
    for (const tile of DEFAULT_STATS_LAYOUT.tiles) {
        if (seen.has(tile.id)) continue
        result.push({ ...tile })
    }
    return assignSequentialOrder(result)
}

function sanitizeTile(candidate: unknown): StatsTileConfig | null {
    if (!candidate || typeof candidate !== "object") return null
    const record = candidate as {
        id?: unknown
        size?: unknown
        visible?: unknown
        locked?: unknown
        order?: unknown
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
    const order =
        typeof record.order === "number" && Number.isFinite(record.order)
            ? Math.max(0, Math.floor(record.order))
            : undefined
    return {
        id,
        size,
        visible,
        locked,
        order,
    }
}

function sanitizeFilters(input: unknown): StatsLayoutFilters {
    if (!input || typeof input !== "object" || Array.isArray(input)) return {}
    const result: StatsLayoutFilters = {}
    for (const [key, value] of Object.entries(input)) {
        result[key] = value
    }
    return result
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

function cloneFilters(source: StatsLayoutFilters): StatsLayoutFilters {
    return sanitizeFilters(source)
}

function cloneState(state: StatsLayoutState): StatsLayoutState {
    return {
        version: state.version,
        tiles: assignSequentialOrder(cloneTiles(state.tiles)),
        filters: cloneFilters(state.filters),
    }
}

function cloneRemoteMeta(meta: StatsLayoutRemoteMeta): StatsLayoutRemoteMeta {
    return {
        context: meta.context,
        created: meta.created,
        updatedAt: meta.updatedAt,
    }
}

function toRemoteMeta(source: StatsLayoutServerState): StatsLayoutRemoteMeta {
    return {
        context: source.context,
        created: source.created,
        updatedAt: source.updatedAt,
    }
}

function assignSequentialOrder(source: StatsTileConfig[]): StatsTileConfig[] {
    return source.map((tile, index) => ({ ...tile, order: index }))
}

function isStatsLayoutContext(value: unknown): value is StatsLayoutContext {
    return (
        value === "stats" ||
        value === "apps" ||
        value === "history" ||
        value === "gallery"
    )
}
