import { ApiError } from "~/utils/error"

type RecordValue = Record<string, unknown>

type GalleryFetchLike = (input: string, init?: RequestInit) => Promise<Response>

const DEFAULT_GALLERY_LINKS: GalleryPaginationLinks = {
    first: null,
    last: null,
    prev: null,
    next: null,
}

function isRecord(value: unknown): value is RecordValue {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getString(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : fallback
}

function getNullableString(value: unknown): string | null {
    return typeof value === "string" ? value : null
}

function getNumber(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : fallback
}

function getNullableNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null
}

function getStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []

    const result: string[] = []
    for (const item of value) {
        if (typeof item === "string") result.push(item)
    }
    return result
}

function getVisibility(value: unknown): GalleryVisibility {
    return value === "public" || value === "unlisted" ? value : "private"
}

function getAssetSource(payload: unknown): RecordValue | null {
    if (isRecord(payload) && isRecord(payload.data)) return payload.data
    return isRecord(payload) ? payload : null
}

function normalizePaginationLinks(payload: unknown): GalleryPaginationLinks {
    if (!isRecord(payload)) return DEFAULT_GALLERY_LINKS

    return {
        first: getNullableString(payload.first),
        last: getNullableString(payload.last),
        prev: getNullableString(payload.prev),
        next: getNullableString(payload.next),
    }
}

function normalizePaginationMeta(payload: unknown): GalleryPaginationMeta {
    if (!isRecord(payload)) {
        return {
            current_page: 1,
            from: null,
            last_page: 1,
            path: "",
            per_page: 0,
            to: null,
            total: 0,
            links: [],
        }
    }

    const rawLinks = Array.isArray(payload.links) ? payload.links : []
    const links: GalleryPaginationLinkItem[] = []
    for (const item of rawLinks) {
        if (!isRecord(item)) continue
        links.push({
            url: getNullableString(item.url),
            label: getString(item.label),
            active: Boolean(item.active),
        })
    }

    return {
        current_page: getNumber(payload.current_page, 1),
        from: getNullableNumber(payload.from),
        last_page: getNumber(payload.last_page, 1),
        path: getString(payload.path),
        per_page: getNumber(payload.per_page),
        to: getNullableNumber(payload.to),
        total: getNumber(payload.total),
        links,
    }
}

export function normalizeGalleryAsset(payload: unknown): GalleryAsset | null {
    const source = getAssetSource(payload)
    if (!source) return null

    return {
        id: getString(source.id),
        userId: getNumber(source.userId),
        appId: getNullableNumber(source.appId),
        appKey: getNullableString(source.appKey),
        appName: getNullableString(source.appName),
        logId: getNullableNumber(source.logId),
        disk: getString(source.disk),
        path: getString(source.path),
        url: getNullableString(source.url),
        publicUrl: getNullableString(source.publicUrl),
        thumbSmall: getNullableString(source.thumbSmall),
        thumbSmallUrl: getNullableString(source.thumbSmallUrl),
        thumbLarge: getNullableString(source.thumbLarge),
        thumbLargeUrl: getNullableString(source.thumbLargeUrl),
        mime: getString(source.mime),
        bytes: getNumber(source.bytes),
        bytesThumbSmall: getNumber(source.bytesThumbSmall),
        bytesThumbLarge: getNumber(source.bytesThumbLarge),
        width: getNullableNumber(source.width),
        height: getNullableNumber(source.height),
        hashSha256: getString(source.hashSha256),
        title: getNullableString(source.title),
        description: getNullableString(source.description),
        tags: getStringArray(source.tags),
        visibility: getVisibility(source.visibility),
        createdAt: getString(source.createdAt),
        updatedAt: getString(source.updatedAt),
        deletedAt: getNullableString(source.deletedAt),
    }
}

export function normalizeGalleryAssetListResponse(
    payload: unknown,
): GalleryAssetListResponse {
    const listSource = isRecord(payload) ? payload : null
    const rawData = Array.isArray(listSource?.data)
        ? listSource.data
        : Array.isArray(payload)
          ? payload
          : []

    const data: GalleryAsset[] = []
    for (const item of rawData) {
        const asset = normalizeGalleryAsset(item)
        if (asset) data.push(asset)
    }

    return {
        data,
        links: normalizePaginationLinks(listSource?.links),
        meta: normalizePaginationMeta(listSource?.meta),
    }
}

export function normalizeGalleryBootstrapResponse(
    payload: unknown,
): GalleryBootstrapResponse {
    const emptyUsage = normalizeGalleryUsage({})
    const emptyLinks = normalizePaginationLinks(undefined)
    const emptyMeta = normalizePaginationMeta(undefined)

    if (!isRecord(payload)) {
        return {
            data: { assets: [], usage: emptyUsage },
            links: emptyLinks,
            meta: emptyMeta,
        }
    }

    const rawData = isRecord(payload.data) ? payload.data : {}
    const rawAssets = Array.isArray(rawData.assets) ? rawData.assets : []
    const assets = rawAssets
        .map((item) => normalizeGalleryAsset(item))
        .filter((a): a is GalleryAsset => a !== null)
    const usage = isRecord(rawData.usage)
        ? normalizeGalleryUsage(rawData.usage)
        : emptyUsage

    return {
        data: { assets, usage },
        links: normalizePaginationLinks(payload.links),
        meta: normalizePaginationMeta(payload.meta),
    }
}

export function normalizeGalleryUsage(payload: unknown): GalleryUsage {
    const source = isRecord(payload) ? payload : {}
    const usedBytes = getNumber(source.usedBytes)
    const maxBytes = getNumber(source.maxBytes)
    const remainingBytes = Math.max(
        0,
        getNumber(source.remainingBytes, maxBytes - usedBytes),
    )

    return {
        usedBytes,
        maxBytes,
        remainingBytes,
        filesCount: getNumber(source.filesCount),
    }
}

export function normalizeGalleryUploadTicketResponse(
    payload: unknown,
): GalleryUploadTicketResponse | null {
    if (!isRecord(payload)) return null

    const rawHeaders = isRecord(payload.headers) ? payload.headers : {}
    const headers = Object.fromEntries(
        Object.entries(rawHeaders).filter(
            (entry): entry is [string, string] => {
                return typeof entry[1] === "string"
            },
        ),
    )

    const token = getString(payload.token)
    const uploadToken =
        headers["x-upload-token"] && headers["x-upload-token"] !== ""
            ? headers["x-upload-token"]
            : token

    return {
        uploadUrl: getString(payload.uploadUrl),
        token,
        expiresAt: getString(payload.expiresAt),
        maxBytes: getNumber(payload.maxBytes),
        allowedMimeTypes: getStringArray(payload.allowedMimeTypes),
        headers: {
            ...headers,
            "x-upload-token": uploadToken,
        },
        meta: isRecord(payload.meta) ? payload.meta : {},
        appId: getNullableNumber(payload.appId),
    }
}

export function buildGalleryDirectUploadFormData(
    request: GalleryDirectUploadRequest,
): FormData {
    const formData = new FormData()
    const fileName = request.fileName ?? "upload.bin"

    formData.append("file", request.file, fileName)

    if (request.logId !== undefined && request.logId !== null) {
        formData.append("log_id", String(request.logId))
    }
    if (request.appKey) {
        formData.append("app_key", request.appKey)
    }
    if (request.title !== undefined && request.title !== null) {
        formData.append("title", request.title)
    }
    if (request.description !== undefined && request.description !== null) {
        formData.append("description", request.description)
    }
    if (request.visibility) {
        formData.append("visibility", request.visibility)
    }

    for (const tag of request.tags ?? []) {
        formData.append("tags[]", tag)
    }

    return formData
}

async function parseGalleryResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
        return await response.json()
    }

    const text = await response.text()
    return text === "" ? null : { message: text }
}

function getUploadToken(ticket: GalleryUploadTicketResponse): string {
    const headerToken = ticket.headers["x-upload-token"]
    return headerToken && headerToken !== "" ? headerToken : ticket.token
}

export async function directUploadGalleryAsset(options: {
    ticket: GalleryUploadTicketResponse
    request: GalleryDirectUploadRequest
    csrfToken: string
    fetchImpl?: GalleryFetchLike
    signal?: AbortSignal
    extraHeaders?: HeadersInit
}): Promise<GalleryAsset> {
    const fetchImpl = options.fetchImpl ?? fetch
    const headers = new Headers(options.extraHeaders)
    headers.set("x-csrf-token", options.csrfToken)
    headers.set("x-upload-token", getUploadToken(options.ticket))

    const response = await fetchImpl(options.ticket.uploadUrl, {
        method: "POST",
        body: buildGalleryDirectUploadFormData(options.request),
        headers,
        credentials: "include",
        signal: options.signal,
    })

    const payload = await parseGalleryResponseBody(response)
    if (!response.ok) {
        const message = isRecord(payload) ? getString(payload.message) : ""
        throw new ApiError(
            message || `Gallery upload failed with ${response.status}`,
            response.status,
            payload,
        )
    }

    const asset = normalizeGalleryAsset(payload)
    if (!asset) {
        throw new Error("Invalid gallery upload response")
    }

    return asset
}
