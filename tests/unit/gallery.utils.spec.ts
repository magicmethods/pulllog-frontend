import { describe, expect, it, vi } from "vitest"
import {
    directUploadGalleryAsset,
    normalizeGalleryAsset,
    normalizeGalleryAssetListResponse,
} from "../../utils/gallery"

const baseAsset = {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    userId: 1,
    appId: null,
    appKey: null,
    appName: null,
    logId: null,
    disk: "public",
    path: "gallery/mock.webp",
    url: "https://cdn.example.test/gallery/mock.webp",
    publicUrl: null,
    thumbSmall: null,
    thumbSmallUrl: null,
    thumbLarge: null,
    thumbLargeUrl: null,
    mime: "image/webp",
    bytes: 1024,
    bytesThumbSmall: 0,
    bytesThumbLarge: 0,
    width: 640,
    height: 480,
    hashSha256: "hash",
    title: "Mock",
    description: null,
    tags: ["sample"],
    visibility: "private",
    createdAt: "2026-04-17T00:00:00.000Z",
    updatedAt: "2026-04-17T00:00:00.000Z",
    deletedAt: null,
}

describe("gallery utils", () => {
    it("normalizes wrapped and raw asset payloads", () => {
        expect(normalizeGalleryAsset({ data: baseAsset })?.id).toBe(
            baseAsset.id,
        )
        expect(normalizeGalleryAsset(baseAsset)?.mime).toBe(baseAsset.mime)
    })

    it("normalizes list response and tolerates raw arrays", () => {
        const wrapped = normalizeGalleryAssetListResponse({
            data: [baseAsset],
            links: { first: null, last: null, prev: null, next: null },
            meta: {
                current_page: 1,
                from: 1,
                last_page: 1,
                path: "/gallery/assets",
                per_page: 10,
                to: 1,
                total: 1,
                links: [],
            },
        })
        const raw = normalizeGalleryAssetListResponse([baseAsset])

        expect(wrapped.data).toHaveLength(1)
        expect(raw.data[0]?.id).toBe(baseAsset.id)
    })

    it("uploads via direct helper with ticket headers and form data", async () => {
        const fetchImpl = vi.fn(async (_input: string, init?: RequestInit) => {
            expect(init?.method).toBe("POST")
            expect(init?.credentials).toBe("include")

            const headers = new Headers(init?.headers)
            expect(headers.get("x-csrf-token")).toBe("csrf-token")
            expect(headers.get("x-upload-token")).toBe("upload-token")

            const formData = init?.body as FormData
            expect(formData.get("title")).toBe("Uploaded title")
            expect(formData.get("tags[]")).toBe("tag-a")

            return new Response(JSON.stringify({ data: baseAsset }), {
                status: 201,
                headers: {
                    "content-type": "application/json",
                },
            })
        })

        const asset = await directUploadGalleryAsset({
            ticket: {
                uploadUrl: "https://api.example.test/gallery/assets",
                token: "upload-token",
                expiresAt: "2026-04-17T00:01:00.000Z",
                maxBytes: 1024,
                allowedMimeTypes: ["image/webp"],
                headers: {
                    "x-upload-token": "upload-token",
                },
                meta: {},
                appId: null,
            },
            request: {
                file: new Blob(["hello"], { type: "image/webp" }),
                fileName: "sample.webp",
                title: "Uploaded title",
                tags: ["tag-a"],
                visibility: "private",
            },
            csrfToken: "csrf-token",
            fetchImpl,
        })

        expect(asset.id).toBe(baseAsset.id)
        expect(fetchImpl).toHaveBeenCalledTimes(1)
    })

    it("throws ApiError with status when direct upload fails", async () => {
        const fetchImpl = vi.fn(async () => {
            return new Response(JSON.stringify({ message: "Conflict" }), {
                status: 409,
                headers: {
                    "content-type": "application/json",
                },
            })
        })

        await expect(
            directUploadGalleryAsset({
                ticket: {
                    uploadUrl: "https://api.example.test/gallery/assets",
                    token: "upload-token",
                    expiresAt: "2026-04-17T00:01:00.000Z",
                    maxBytes: 1024,
                    allowedMimeTypes: ["image/webp"],
                    headers: {
                        "x-upload-token": "upload-token",
                    },
                    meta: {},
                    appId: null,
                },
                request: {
                    file: new Blob(["hello"], { type: "image/webp" }),
                    fileName: "sample.webp",
                },
                csrfToken: "csrf-token",
                fetchImpl,
            }),
        ).rejects.toMatchObject({
            name: "ApiError",
            status: 409,
            message: "Conflict",
        })
    })
})
