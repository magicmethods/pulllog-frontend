import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"

const galleryApiMock = {
    list: vi.fn(),
    detail: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    usage: vi.fn(),
    requestUploadTicket: vi.fn(),
    directUpload: vi.fn(),
}

vi.mock("~/composables/useGalleryApi", () => ({
    useGalleryApi: () => galleryApiMock,
}))

import { useGalleryStore } from "../../stores/useGalleryStore"

function createAsset(id: string): GalleryAsset {
    return {
        id,
        userId: 1,
        appId: null,
        appKey: null,
        appName: null,
        logId: null,
        disk: "public",
        path: `gallery/${id}.webp`,
        url: `https://cdn.example.test/gallery/${id}.webp`,
        publicUrl: null,
        thumbSmall: null,
        thumbSmallUrl: null,
        thumbLarge: null,
        thumbLargeUrl: null,
        mime: "image/webp",
        bytes: 1024,
        bytesThumbSmall: 0,
        bytesThumbLarge: 0,
        width: 100,
        height: 100,
        hashSha256: `hash-${id}`,
        title: `Asset ${id}`,
        description: null,
        tags: [],
        visibility: "private",
        createdAt: "2026-04-17T00:00:00.000Z",
        updatedAt: "2026-04-17T00:00:00.000Z",
        deletedAt: null,
    }
}

function createListResponse(
    page: number,
    assetIds: string[],
    options: {
        lastPage?: number
        next?: string | null
        total?: number
    } = {},
): GalleryAssetListResponse {
    const lastPage = options.lastPage ?? page
    const total = options.total ?? assetIds.length

    return {
        data: assetIds.map((id) => createAsset(id)),
        links: {
            first: "/gallery/assets?page=1",
            last: `/gallery/assets?page=${lastPage}`,
            prev: page > 1 ? `/gallery/assets?page=${page - 1}` : null,
            next: options.next ?? null,
        },
        meta: {
            current_page: page,
            from: assetIds.length > 0 ? 1 : null,
            last_page: lastPage,
            path: "/gallery/assets",
            per_page: 10,
            to: assetIds.length > 0 ? assetIds.length : null,
            total,
            links: [],
        },
    }
}

function createUploadTicket(): GalleryUploadTicketResponse {
    return {
        uploadUrl: "https://api.example.test/gallery/assets",
        token: "upload-token",
        expiresAt: "2026-04-17T00:01:00.000Z",
        maxBytes: 1024 * 1024,
        allowedMimeTypes: ["image/webp"],
        headers: {
            "x-upload-token": "upload-token",
        },
        meta: {},
        appId: null,
    }
}

function createUsageResponse(): GalleryUsage {
    return {
        usedBytes: 2048,
        maxBytes: 1024 * 1024,
        remainingBytes: 1024 * 1024 - 2048,
        filesCount: 2,
    }
}

describe("useGalleryStore", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it("fetchList resets assets and stores pagination state", async () => {
        const store = useGalleryStore()
        galleryApiMock.list.mockResolvedValueOnce(
            createListResponse(1, ["asset-a", "asset-b"], {
                lastPage: 2,
                next: "/gallery/assets?page=2",
                total: 3,
            }),
        )

        await store.fetchList({ page: 1, per: 10 })

        expect(galleryApiMock.list).toHaveBeenCalledWith({ page: 1, per: 10 })
        expect(store.assets.map((asset) => asset.id)).toEqual([
            "asset-a",
            "asset-b",
        ])
        expect(store.meta.current_page).toBe(1)
        expect(store.hasNextPage).toBe(true)
    })

    it("fetchNextPage appends assets when a next page exists", async () => {
        const store = useGalleryStore()
        galleryApiMock.list
            .mockResolvedValueOnce(
                createListResponse(1, ["asset-a", "asset-b"], {
                    lastPage: 2,
                    next: "/gallery/assets?page=2",
                    total: 4,
                }),
            )
            .mockResolvedValueOnce(
                createListResponse(2, ["asset-c", "asset-d"], {
                    lastPage: 2,
                    next: null,
                    total: 4,
                }),
            )

        await store.fetchList({ page: 1, per: 10 })
        await store.fetchNextPage()

        expect(galleryApiMock.list).toHaveBeenNthCalledWith(2, {
            page: 2,
            per: 10,
        })
        expect(store.assets.map((asset) => asset.id)).toEqual([
            "asset-a",
            "asset-b",
            "asset-c",
            "asset-d",
        ])
        expect(store.meta.current_page).toBe(2)
        expect(store.hasNextPage).toBe(false)
    })

    it("uploadAsset refreshes list and usage after a successful upload", async () => {
        const store = useGalleryStore()
        galleryApiMock.list
            .mockResolvedValueOnce(
                createListResponse(1, ["asset-a"], {
                    lastPage: 1,
                    next: null,
                    total: 1,
                }),
            )
            .mockResolvedValueOnce(
                createListResponse(1, ["asset-uploaded", "asset-a"], {
                    lastPage: 1,
                    next: null,
                    total: 2,
                }),
            )
        galleryApiMock.requestUploadTicket.mockResolvedValueOnce(
            createUploadTicket(),
        )
        galleryApiMock.directUpload.mockResolvedValueOnce(
            createAsset("asset-uploaded"),
        )
        galleryApiMock.usage.mockResolvedValueOnce(createUsageResponse())

        await store.fetchList({ page: 1, per: 10 })
        await store.uploadAsset({
            file: new Blob(["image"], { type: "image/webp" }),
            fileName: "uploaded.webp",
            title: "Uploaded",
            visibility: "private",
        })

        expect(galleryApiMock.requestUploadTicket).toHaveBeenCalledWith({
            fileName: "uploaded.webp",
            expectedBytes: 5,
            mime: "image/webp",
            visibility: "private",
            logId: null,
            tags: [],
            appKey: null,
        })
        expect(galleryApiMock.list).toHaveBeenNthCalledWith(2, {
            page: 1,
            per: 10,
        })
        expect(galleryApiMock.usage).toHaveBeenCalledTimes(1)
        expect(store.assets.map((asset) => asset.id)).toEqual([
            "asset-uploaded",
            "asset-a",
        ])
        expect(store.usage?.filesCount).toBe(2)
        expect(store.selectedAssetId).toBe("asset-uploaded")
    })

    it("fetchDetail stores the selected asset without setting page error", async () => {
        const store = useGalleryStore()
        const asset = createAsset("asset-detail")
        galleryApiMock.detail.mockResolvedValueOnce(asset)

        await store.fetchDetail(asset.id)

        expect(galleryApiMock.detail).toHaveBeenCalledWith(asset.id)
        expect(store.selectedAssetId).toBe(asset.id)
        expect(store.assetMap[asset.id]?.id).toBe(asset.id)
        expect(store.error).toBeNull()
    })

    it("updateAsset updates the selected asset without leaking page error", async () => {
        const store = useGalleryStore()
        const asset = createAsset("asset-a")
        const updatedAsset: GalleryAsset = {
            ...asset,
            title: "Updated title",
            description: "Updated description",
            visibility: "public",
        }

        galleryApiMock.list.mockResolvedValueOnce(
            createListResponse(1, [asset.id], {
                lastPage: 1,
                next: null,
                total: 1,
            }),
        )
        galleryApiMock.update.mockResolvedValueOnce(updatedAsset)

        await store.fetchList({ page: 1, per: 10 })
        await store.updateAsset(asset.id, {
            title: updatedAsset.title,
            description: updatedAsset.description,
            visibility: updatedAsset.visibility,
        })

        expect(galleryApiMock.update).toHaveBeenCalledWith(asset.id, {
            title: "Updated title",
            description: "Updated description",
            visibility: "public",
        })
        expect(store.assetMap[asset.id]?.title).toBe("Updated title")
        expect(store.error).toBeNull()
    })

    it("detail action failures do not overwrite page-level error state", async () => {
        const store = useGalleryStore()
        galleryApiMock.list.mockRejectedValueOnce(new Error("List failed"))

        await expect(store.fetchList({ page: 1, per: 10 })).rejects.toThrow(
            "List failed",
        )
        expect(store.error).toBe("List failed")

        galleryApiMock.detail.mockRejectedValueOnce(new Error("Detail failed"))
        await expect(store.fetchDetail("asset-a")).rejects.toThrow(
            "Detail failed",
        )
        expect(store.error).toBe("List failed")

        galleryApiMock.update.mockRejectedValueOnce(new Error("Update failed"))
        await expect(
            store.updateAsset("asset-a", {
                title: "Updated title",
                description: null,
                visibility: "private",
            }),
        ).rejects.toThrow("Update failed")
        expect(store.error).toBe("List failed")

        galleryApiMock.delete.mockRejectedValueOnce(new Error("Delete failed"))
        await expect(store.deleteAsset("asset-a")).rejects.toThrow(
            "Delete failed",
        )
        expect(store.error).toBe("List failed")
    })

    it("deleteAsset removes the asset from state and clears the selection", async () => {
        const store = useGalleryStore()
        galleryApiMock.list.mockResolvedValueOnce(
            createListResponse(1, ["asset-a", "asset-b"], {
                lastPage: 1,
                next: null,
                total: 2,
            }),
        )
        galleryApiMock.delete.mockResolvedValueOnce(true)
        galleryApiMock.usage.mockResolvedValueOnce(createUsageResponse())

        await store.fetchList({ page: 1, per: 10 })
        store.selectAsset("asset-a")

        await store.deleteAsset("asset-a")

        expect(galleryApiMock.delete).toHaveBeenCalledWith("asset-a")
        expect(store.assets.map((asset) => asset.id)).toEqual(["asset-b"])
        expect(store.assetMap["asset-a"]).toBeUndefined()
        expect(store.selectedAssetId).toBeNull()
    })
})
