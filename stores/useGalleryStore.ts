import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { useGalleryApi } from "~/composables/useGalleryApi"

function createDefaultGalleryFilters(): GalleryAssetListParams {
    return {
        page: 1,
        per: 10,
    }
}

function createEmptyGalleryMeta(): GalleryPaginationMeta {
    return {
        current_page: 1,
        from: null,
        last_page: 1,
        path: "",
        per_page: 10,
        to: null,
        total: 0,
        links: [],
    }
}

export const useGalleryStore = defineStore("gallery", () => {
    const galleryApi = useGalleryApi()

    const assets = ref<GalleryAsset[]>([])
    const assetMap = ref<Record<string, GalleryAsset>>({})
    const selectedAssetId = ref<string | null>(null)
    const usage = ref<GalleryUsage | null>(null)
    const filters = ref<GalleryAssetListParams>(createDefaultGalleryFilters())
    const links = ref<GalleryPaginationLinks>({
        first: null,
        last: null,
        prev: null,
        next: null,
    })
    const meta = ref<GalleryPaginationMeta>(createEmptyGalleryMeta())
    const lastUploadTicket = ref<GalleryUploadTicketResponse | null>(null)
    const isLoading = ref(false)
    const isUsageLoading = ref(false)
    const isSaving = ref(false)
    const isUploading = ref(false)
    const error = ref<string | null>(null)

    const selectedAsset = computed<GalleryAsset | null>(() => {
        if (!selectedAssetId.value) return null
        return assetMap.value[selectedAssetId.value] ?? null
    })

    const hasNextPage = computed<boolean>(() => {
        return (
            Boolean(links.value.next) &&
            meta.value.current_page < meta.value.last_page
        )
    })

    function syncAssetMap(nextAssets: GalleryAsset[]): void {
        const nextMap: Record<string, GalleryAsset> = {}
        for (const asset of nextAssets) {
            nextMap[asset.id] = asset
        }
        assetMap.value = {
            ...assetMap.value,
            ...nextMap,
        }
    }

    function upsertAsset(asset: GalleryAsset): void {
        assetMap.value = {
            ...assetMap.value,
            [asset.id]: asset,
        }

        const index = assets.value.findIndex((item) => item.id === asset.id)
        if (index === -1) {
            assets.value = [asset, ...assets.value]
            return
        }

        const nextAssets = [...assets.value]
        nextAssets[index] = asset
        assets.value = nextAssets
    }

    function appendAssets(nextAssets: GalleryAsset[]): void {
        const mergedAssets = [...assets.value]

        for (const asset of nextAssets) {
            const index = mergedAssets.findIndex((item) => item.id === asset.id)
            if (index === -1) {
                mergedAssets.push(asset)
                continue
            }

            mergedAssets[index] = asset
        }

        assets.value = mergedAssets
    }

    function applyListResponse(
        response: GalleryAssetListResponse,
        append = false,
    ): void {
        if (append) {
            appendAssets(response.data)
        } else {
            assets.value = response.data
        }

        syncAssetMap(response.data)
        links.value = response.links
        meta.value = response.meta
    }

    function removeAssetFromState(assetId: string): void {
        assets.value = assets.value.filter((asset) => asset.id !== assetId)

        const nextMap = { ...assetMap.value }
        delete nextMap[assetId]
        assetMap.value = nextMap

        if (selectedAssetId.value === assetId) {
            selectedAssetId.value = null
        }
    }

    function clearError(): void {
        error.value = null
    }

    function reset(): void {
        assets.value = []
        assetMap.value = {}
        selectedAssetId.value = null
        usage.value = null
        filters.value = createDefaultGalleryFilters()
        links.value = {
            first: null,
            last: null,
            prev: null,
            next: null,
        }
        meta.value = createEmptyGalleryMeta()
        lastUploadTicket.value = null
        isUsageLoading.value = false
        error.value = null
    }

    async function fetchList(
        nextFilters: GalleryAssetListParams = {},
    ): Promise<GalleryAssetListResponse> {
        isLoading.value = true
        clearError()

        try {
            filters.value = {
                ...filters.value,
                ...nextFilters,
            }

            const response = await galleryApi.list(filters.value)
            applyListResponse(response)
            return response
        } catch (cause: unknown) {
            error.value =
                cause instanceof Error
                    ? cause.message
                    : "Failed to fetch gallery assets"
            throw cause
        } finally {
            isLoading.value = false
        }
    }

    async function fetchNextPage(): Promise<GalleryAssetListResponse | null> {
        if (isLoading.value || !hasNextPage.value) {
            return null
        }

        isLoading.value = true
        clearError()

        try {
            const nextFilters: GalleryAssetListParams = {
                ...filters.value,
                page: meta.value.current_page + 1,
            }

            const response = await galleryApi.list(nextFilters)
            filters.value = nextFilters
            applyListResponse(response, true)
            return response
        } catch (cause: unknown) {
            error.value =
                cause instanceof Error
                    ? cause.message
                    : "Failed to fetch gallery assets"
            throw cause
        } finally {
            isLoading.value = false
        }
    }

    async function fetchDetail(assetId: string): Promise<GalleryAsset> {
        isLoading.value = true
        clearError()

        try {
            const asset = await galleryApi.detail(assetId)
            selectedAssetId.value = assetId
            upsertAsset(asset)
            return asset
        } catch (cause: unknown) {
            error.value =
                cause instanceof Error
                    ? cause.message
                    : "Failed to fetch gallery asset"
            throw cause
        } finally {
            isLoading.value = false
        }
    }

    async function fetchUsage(): Promise<GalleryUsage> {
        isUsageLoading.value = true
        clearError()

        try {
            const response = await galleryApi.usage()
            usage.value = response
            return response
        } catch (cause: unknown) {
            error.value =
                cause instanceof Error
                    ? cause.message
                    : "Failed to fetch gallery usage"
            throw cause
        } finally {
            isUsageLoading.value = false
        }
    }

    async function updateAsset(
        assetId: string,
        payload: GalleryAssetUpdateRequest,
    ): Promise<GalleryAsset> {
        isSaving.value = true
        clearError()

        try {
            const asset = await galleryApi.update(assetId, payload)
            upsertAsset(asset)
            return asset
        } catch (cause: unknown) {
            error.value =
                cause instanceof Error
                    ? cause.message
                    : "Failed to update gallery asset"
            throw cause
        } finally {
            isSaving.value = false
        }
    }

    async function deleteAsset(assetId: string): Promise<boolean> {
        isSaving.value = true
        clearError()

        try {
            const deleted = await galleryApi.delete(assetId)
            if (deleted) {
                removeAssetFromState(assetId)
                fetchUsage().catch(() => {})
            }
            return deleted
        } catch (cause: unknown) {
            error.value =
                cause instanceof Error
                    ? cause.message
                    : "Failed to delete gallery asset"
            throw cause
        } finally {
            isSaving.value = false
        }
    }

    async function requestUploadTicket(
        payload: GalleryUploadTicketRequest,
    ): Promise<GalleryUploadTicketResponse> {
        isUploading.value = true
        clearError()

        try {
            const ticket = await galleryApi.requestUploadTicket(payload)
            lastUploadTicket.value = ticket
            return ticket
        } catch (cause: unknown) {
            error.value =
                cause instanceof Error
                    ? cause.message
                    : "Failed to request gallery upload ticket"
            throw cause
        } finally {
            isUploading.value = false
        }
    }

    async function uploadAsset(
        request: GalleryDirectUploadRequest,
    ): Promise<GalleryAsset> {
        isUploading.value = true
        clearError()

        try {
            const ticket = await galleryApi.requestUploadTicket({
                fileName: request.fileName ?? null,
                expectedBytes:
                    typeof request.file.size === "number"
                        ? request.file.size
                        : null,
                mime:
                    typeof request.file.type === "string" &&
                    request.file.type !== ""
                        ? request.file.type
                        : null,
                visibility: request.visibility ?? null,
                logId: request.logId ?? null,
                tags: request.tags ?? [],
                appKey: request.appKey ?? null,
            })

            lastUploadTicket.value = ticket

            const asset = await galleryApi.directUpload({
                ticket,
                request,
            })

            upsertAsset(asset)
            selectedAssetId.value = asset.id

            const refreshFilters: GalleryAssetListParams = {
                ...filters.value,
                page: 1,
            }

            const [listResult, usageResult] = await Promise.allSettled([
                galleryApi.list(refreshFilters),
                galleryApi.usage(),
            ])

            if (listResult.status === "fulfilled") {
                filters.value = refreshFilters
                applyListResponse(listResult.value)
            }

            if (usageResult.status === "fulfilled") {
                usage.value = usageResult.value
            }

            return asset
        } catch (cause: unknown) {
            error.value =
                cause instanceof Error
                    ? cause.message
                    : "Failed to upload gallery asset"
            throw cause
        } finally {
            isUploading.value = false
        }
    }

    function selectAsset(assetId: string | null): void {
        selectedAssetId.value = assetId
    }

    return {
        assets,
        assetMap,
        selectedAssetId,
        selectedAsset,
        usage,
        filters,
        links,
        meta,
        lastUploadTicket,
        isLoading,
        isUsageLoading,
        isSaving,
        isUploading,
        error,
        hasNextPage,
        reset,
        clearError,
        selectAsset,
        fetchList,
        fetchNextPage,
        fetchDetail,
        fetchUsage,
        updateAsset,
        deleteAsset,
        requestUploadTicket,
        uploadAsset,
    }
})
