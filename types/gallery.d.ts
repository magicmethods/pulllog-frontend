/**
 * Gallery API types
 */
declare global {
    type GalleryVisibility = "private" | "unlisted" | "public"

    type GalleryAsset = {
        id: string
        userId: number
        appId: number | null
        appKey: string | null
        appName: string | null
        logId: number | null
        disk: string
        path: string
        url: string | null
        publicUrl: string | null
        thumbSmall: string | null
        thumbSmallUrl: string | null
        thumbLarge: string | null
        thumbLargeUrl: string | null
        mime: string
        bytes: number
        bytesThumbSmall: number
        bytesThumbLarge: number
        width: number | null
        height: number | null
        hashSha256: string
        title: string | null
        description: string | null
        tags: string[]
        visibility: GalleryVisibility
        createdAt: string
        updatedAt: string
        deletedAt: string | null
    }

    type GalleryAssetListParams = {
        page?: number
        per?: number
        from?: string
        to?: string
        log_id?: number
        tags?: string[]
        q?: string
    }

    type GalleryPaginationLinkItem = {
        url: string | null
        label: string
        active: boolean
    }

    type GalleryPaginationLinks = {
        first: string | null
        last: string | null
        prev: string | null
        next: string | null
    }

    type GalleryPaginationMeta = {
        current_page: number
        from: number | null
        last_page: number
        path: string
        per_page: number
        to: number | null
        total: number
        links: GalleryPaginationLinkItem[]
    }

    type GalleryAssetResponse = {
        data: GalleryAsset
    }

    type GalleryAssetListResponse = {
        data: GalleryAsset[]
        links: GalleryPaginationLinks
        meta: GalleryPaginationMeta
    }

    type GalleryUsage = {
        usedBytes: number
        maxBytes: number
        remainingBytes: number
        filesCount: number
    }

    type GalleryBootstrapData = {
        assets: GalleryAsset[]
        usage: GalleryUsage
    }

    type GalleryBootstrapResponse = {
        data: GalleryBootstrapData
        links: GalleryPaginationLinks
        meta: GalleryPaginationMeta
    }

    type GalleryUploadTicketRequest = {
        fileName?: string | null
        expectedBytes?: number | null
        mime?: string | null
        visibility?: GalleryVisibility | null
        logId?: number | null
        tags?: string[]
        appKey?: string | null
    }

    type GalleryUploadTicketHeaders = {
        "x-upload-token": string
    } & Record<string, string>

    type GalleryUploadTicketResponse = {
        uploadUrl: string
        token: string
        expiresAt: string
        maxBytes: number
        allowedMimeTypes: string[]
        headers: GalleryUploadTicketHeaders
        meta: Record<string, unknown>
        appId: number | null
    }

    type GalleryAssetUpdateRequest = {
        log_id?: number | null
        title?: string | null
        description?: string | null
        tags?: string[]
        visibility?: GalleryVisibility | null
    }

    type GalleryDirectUploadRequest = {
        file: Blob
        fileName?: string
        logId?: number | null
        appKey?: string | null
        title?: string | null
        description?: string | null
        tags?: string[]
        visibility?: GalleryVisibility | null
    }
}

export {}
