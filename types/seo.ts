/**
 * SEO/OGP 用の型およびロケール変換ユーティリティ。
 * - any の使用禁止に従い、明示的な型を提供
 */

export type UiLocale = "ja" | "en" | "zh"

export type OgLocale = "ja_JP" | "en_US" | "zh"

export interface SeoOgOptions {
    /** ページタイトル（言語別に渡す） */
    title: string
    /** ページ説明（言語別に渡す） */
    description: string
    /** ルートからの相対パスまたは絶対URL */
    imagePath?: string
    /** 正規URL計算用のパス（未指定時は現在の `route.path`） */
    path?: string
    /** 画像幅（既定: 1200） */
    imageWidth?: number
    /** 画像高（既定: 630） */
    imageHeight?: number
    /** 現在のUIロケール（未指定時はURLから推定） */
    currentLocale?: UiLocale
    /** 利用する全UIロケール一覧（未指定時は ['ja','en','zh']） */
    locales?: UiLocale[]
}

export interface SeoRuntimeDefaults {
    siteUrl: string
    siteName: string
    defaultOgImage: string
    twitterHandle: string
}

/** UI ロケール → OGP ロケールの単純変換（要件に合わせて zh はそのまま） */
export const uiToOgLocale = (locale: UiLocale): OgLocale => {
    if (locale === "ja") return "ja_JP"
    if (locale === "en") return "en_US"
    return "zh"
}

/** 指定が絶対URLかどうか */
export const isAbsoluteUrl = (value: string): boolean =>
    /^([a-z][a-z0-9+.-]*:)?\/\//i.test(value)

/** base と path から絶対URLを生成 */
export const toAbsoluteUrl = (base: string, path: string): string => {
    if (isAbsoluteUrl(path)) {
        // `//example.com/foo` 形式は https スキームを補完
        if (path.startsWith("//")) return `https:${path}`
        return path
    }
    try {
        return new URL(path, base).toString()
    } catch {
        return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
    }
}
