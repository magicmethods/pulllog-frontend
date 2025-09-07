/**
 * 画像ユーティリティ（シェア用合成）
 */

export type ComposeOptions = {
    width?: number // 出力幅（既定640）
    margin?: number // 外枠の余白（既定15）
    gap?: number // 画像間余白（既定15）
    background?: string | null // 背景色（未指定/ null なら透過）
    watermarkText?: string // 右下ウォーターマーク（既定 'PullLog.net'）
    watermarkPadding?: number // 余白（既定 10）
    watermarkFont?: string // フォント指定（例 'bold 16px system-ui'）
    watermarkColor?: string // 明示カラー。未指定時は背景から自動算出
    headerText?: string // 画像上部の見出し（未指定なら描画しない）
    headerFont?: string // 見出しフォント
    headerColor?: string // 見出し色
    headerPadding?: number // 見出し周辺の余白（既定 8）
    divider?: boolean | { color?: string; thickness?: number; inset?: number } // 各画像間の罫線
}

export async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
    const url = URL.createObjectURL(blob)
    try {
        const img = await loadImage(url)
        return img
    } finally {
        URL.revokeObjectURL(url)
    }
}

export function dataUrlToBlob(dataUrl: string): Blob {
    const [meta, base64] = dataUrl.split(",")
    const mime = /data:([^;]+);/i.exec(meta)?.[1] ?? "image/png"
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new Blob([bytes], { type: mime })
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
    return await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}

function parseRgb(str: string): { r: number; g: number; b: number } | null {
    const m = str.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
    if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) }
    const mh = str.match(/^#([0-9a-f]{6})$/i)
    if (mh) {
        const v = Number.parseInt(mh[1], 16)
        return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff }
    }
    return null
}

function isDarkColor(color?: string | null): boolean {
    if (!color) return false
    const rgb = parseRgb(color)
    if (!rgb) return false
    // perceived luminance
    const y = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b
    return y < 140
}

/**
 * PNG画像群を縦方向に連結して1枚のPNG Blobを返す
 */
export async function composeVertical(
    images: (Blob | string | HTMLImageElement)[],
    opts: ComposeOptions = {},
): Promise<Blob> {
    const width = opts.width ?? 640
    const margin = opts.margin ?? 15
    const gap = opts.gap ?? 15
    const headerText = opts.headerText ?? ""
    const headerPadding = opts.headerPadding ?? 8
    const headerFont =
        opts.headerFont ?? "700 16px system-ui, -apple-system, Segoe UI, Roboto"
    const watermarkText = opts.watermarkText ?? "PullLog.net"
    const watermarkPadding = opts.watermarkPadding ?? 10
    const watermarkFont =
        opts.watermarkFont ??
        "600 14px system-ui, -apple-system, Segoe UI, Roboto"

    const imgs: HTMLImageElement[] = []
    for (const it of images) {
        if (it instanceof HTMLImageElement) {
            imgs.push(it)
        } else if (typeof it === "string") {
            imgs.push(await loadImage(it))
        } else {
            imgs.push(await blobToImage(it))
        }
    }
    const innerW = width - margin * 2
    const scaled = imgs.map((im) => {
        const w = innerW
        const h = Math.round((w / im.naturalWidth) * im.naturalHeight)
        return { im, w, h }
    })
    const innerHeight = scaled.reduce(
        (sum, s, i) => sum + s.h + (i > 0 ? gap : 0),
        0,
    )
    // 見出しの高さ（テキストを描く場合のみ）
    let headerHeight = 0
    if (headerText && headerText.trim().length > 0) {
        // 目安: フォントサイズの約1.6倍 + パディング
        headerHeight = 24 + headerPadding * 2
    }
    const height = innerHeight + margin * 2 + headerHeight

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("canvas context not available")

    // 背景
    if (opts.background) {
        ctx.fillStyle = opts.background
        ctx.fillRect(0, 0, width, height)
    }

    // 見出し
    let yOffset = margin
    if (headerText && headerHeight > 0) {
        ctx.font = headerFont
        ctx.fillStyle = opts.headerColor
            ? opts.headerColor
            : isDarkColor(opts.background)
              ? "rgba(255,255,255,0.92)"
              : "rgba(0,0,0,0.82)"
        ctx.textBaseline = "top"
        ctx.fillText(
            headerText,
            margin + headerPadding,
            yOffset + headerPadding,
        )
        yOffset += headerHeight
    }

    // 本体描画
    let y = yOffset
    for (let i = 0; i < scaled.length; i++) {
        if (i > 0) y += gap
        const s = scaled[i]
        ctx.drawImage(s.im, margin, y, s.w, s.h)
        y += s.h
        // 罫線
        if (i < scaled.length - 1 && opts.divider) {
            const cfg =
                typeof opts.divider === "object" && opts.divider
                    ? opts.divider
                    : {}
            const thickness = Math.max(1, Math.floor(cfg.thickness ?? 1))
            const inset = Math.max(0, Math.floor(cfg.inset ?? 10))
            ctx.fillStyle = cfg.color
                ? cfg.color
                : isDarkColor(opts.background)
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(0,0,0,0.12)"
            const lineY = y + Math.floor(gap / 2) - Math.floor(thickness / 2)
            ctx.fillRect(
                margin + inset,
                lineY,
                width - (margin + inset) * 2,
                thickness,
            )
        }
    }

    // ウォーターマーク
    const wmColor =
        opts.watermarkColor ??
        (isDarkColor(opts.background)
            ? "rgba(255,255,255,0.85)"
            : "rgba(0,0,0,0.6)")
    ctx.font = watermarkFont
    ctx.fillStyle = wmColor
    ctx.textBaseline = "bottom"
    const metrics = ctx.measureText(watermarkText)
    const wmX = width - margin - watermarkPadding - metrics.width
    // ボトム寄せを強める（マージンにかかっても良い前提で、marginを引かずに配置）
    const wmY = height - Math.max(2, watermarkPadding)
    ctx.fillText(watermarkText, wmX, wmY)

    const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
    )
    if (!blob) throw new Error("failed to compose image")
    return blob
}

/**
 * Blobをダウンロードする（a要素方式）
 */
export function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
