import { useRequestURL } from "nuxt/app"

/**
 * エラーページの絶対URLを生成するユーティリティ関数
 * @param path エラーページのパス（例: `/error/{num}/`）
 * @returns `{FQDN}/error/{num}/` の形式のURL
 */
export const absoluteErrorUrl = (path: string): string => {
    if (typeof window !== "undefined") {
        // クライアント側では `window.location.origin` を利用
        return `${window.location.origin}${path}`
    }

    const requestURL = useRequestURL()
    return `${requestURL.origin}${path}`
}
