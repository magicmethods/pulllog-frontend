import { endpoints } from "~/api/endpoints"
import { useAPI } from "~/composables/useAPI"
import { useCsrfStore } from "~/stores/useCsrfStore"
import {
    directUploadGalleryAsset,
    normalizeGalleryAsset,
    normalizeGalleryAssetListResponse,
    normalizeGalleryBootstrapResponse,
    normalizeGalleryUploadTicketResponse,
    normalizeGalleryUsage,
} from "~/utils/gallery"

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function useGalleryApi() {
    const { callApi } = useAPI()
    const csrfStore = useCsrfStore()
    const config = useConfig()

    async function ensureGalleryToken(): Promise<void> {
        if (config.mockMode) return

        const ensured = await csrfStore.ensureToken()
        if (!ensured) {
            throw new Error("CSRF token is not available")
        }
    }

    async function loadMockDirectUpload(
        ticket?: GalleryUploadTicketResponse,
    ): Promise<GalleryAsset> {
        const mockUrl =
            isRecord(ticket?.meta) &&
            typeof ticket.meta.mockUploadResponseUrl === "string"
                ? ticket.meta.mockUploadResponseUrl
                : "/mocks/gallery_assets_upload-direct.json"

        const response = await fetch(mockUrl)
        if (!response.ok) {
            throw new Error("Mock gallery upload response is not available")
        }

        const payload = await response.json()
        const asset = normalizeGalleryAsset(payload)
        if (!asset) {
            throw new Error("Invalid mock gallery upload response")
        }

        return asset
    }

    async function list(
        params: GalleryAssetListParams = {},
    ): Promise<GalleryAssetListResponse> {
        await ensureGalleryToken()
        const response = await callApi<
            GalleryAssetListResponse | GalleryAsset[]
        >({
            endpoint: endpoints.gallery.list(),
            method: "GET",
            params,
            onAuthError: "throw",
        })

        return normalizeGalleryAssetListResponse(response)
    }

    async function detail(assetId: string): Promise<GalleryAsset> {
        await ensureGalleryToken()
        const response = await callApi<GalleryAssetResponse | GalleryAsset>({
            endpoint: endpoints.gallery.detail(assetId),
            method: "GET",
            onAuthError: "throw",
        })
        const asset = normalizeGalleryAsset(response)
        if (!asset) {
            throw new Error("Invalid gallery asset response")
        }
        return asset
    }

    async function update(
        assetId: string,
        payload: GalleryAssetUpdateRequest,
    ): Promise<GalleryAsset> {
        await ensureGalleryToken()
        const response = await callApi<GalleryAssetResponse | GalleryAsset>({
            endpoint: endpoints.gallery.update(assetId),
            method: "PATCH",
            data: payload,
            onAuthError: "throw",
        })
        const asset = normalizeGalleryAsset(response)
        if (!asset) {
            throw new Error("Invalid gallery asset update response")
        }
        return asset
    }

    async function remove(assetId: string): Promise<boolean> {
        await ensureGalleryToken()
        const response = await callApi<DeleteResponse>({
            endpoint: endpoints.gallery.delete(assetId),
            method: "DELETE",
            onAuthError: "throw",
        })

        return response === null || response?.state === "success"
    }

    async function usage(): Promise<GalleryUsage> {
        await ensureGalleryToken()
        const response = await callApi<GalleryUsage>({
            endpoint: endpoints.gallery.usage(),
            method: "GET",
            onAuthError: "throw",
        })

        return normalizeGalleryUsage(response)
    }

    async function bootstrap(
        params: GalleryAssetListParams = {},
    ): Promise<GalleryBootstrapResponse> {
        await ensureGalleryToken()
        const response = await callApi<GalleryBootstrapResponse>({
            endpoint: endpoints.gallery.bootstrap(),
            method: "GET",
            params,
            onAuthError: "throw",
            timeout: 20,
        })

        return normalizeGalleryBootstrapResponse(response)
    }

    async function requestUploadTicket(
        payload: GalleryUploadTicketRequest,
    ): Promise<GalleryUploadTicketResponse> {
        await ensureGalleryToken()
        const response = await callApi<GalleryUploadTicketResponse>({
            endpoint: endpoints.gallery.uploadTicket(),
            method: "POST",
            data: payload,
            onAuthError: "throw",
        })
        const ticket = normalizeGalleryUploadTicketResponse(response)
        if (!ticket) {
            throw new Error("Invalid gallery upload ticket response")
        }
        return ticket
    }

    async function directUpload(options: {
        ticket: GalleryUploadTicketResponse
        request: GalleryDirectUploadRequest
        signal?: AbortSignal
    }): Promise<GalleryAsset> {
        if (config.mockMode) {
            return await loadMockDirectUpload(options.ticket)
        }

        await ensureGalleryToken()
        return await directUploadGalleryAsset({
            ticket: options.ticket,
            request: options.request,
            csrfToken: csrfStore.token,
            signal: options.signal,
        })
    }

    return {
        list,
        detail,
        update,
        delete: remove,
        usage,
        bootstrap,
        requestUploadTicket,
        directUpload,
    }
}
