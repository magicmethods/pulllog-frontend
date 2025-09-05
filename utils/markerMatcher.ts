import {
    type Marker,
    aggregateSynonyms,
    markerSynonyms,
} from "~/config/markerSynonyms"
import { stripEmoji } from "~/utils/string"

// Types
type Compiled = {
    [K in Marker]: RegExp
}
type CountOptions = {
    scope?: "global" | "by-locale" // 既定: 'global'
    locale?: string // by-locale の時だけ利用
}

// エスケープ
function escapeRegex(src: string): string {
    return src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// 軽量正規化：NFKC、英小文字化、句読点の簡易統一、絵文字除去等
function normalize(text: string): string {
    const t1 = text.normalize("NFKC")
    const t2 = stripEmoji(t1)
    const lower = t2.toLowerCase()
    // よくある区切りをスペースに寄せる（「/」「-」「,」「()」など）
    const unified = lower.replace(/[/\-_,()]/g, " ")
    // 連続空白の圧縮
    return unified.replace(/\s+/g, " ").trim()
}

const BOUNDARY_CLASS = "[\\s|,;:.!?]"

const cache = new Map<string, Compiled>() // キー: locale or "__global__"

function buildRegexFromSynonyms(syns: string[]): RegExp {
    const alts = syns
        .map(normalize)
        .filter((s) => s.length > 0)
        .map(escapeRegex)

    const leftBoundary = `(?:^|${BOUNDARY_CLASS})`
    const rightBoundary = `(?:(?:${BOUNDARY_CLASS})|$)`
    const source = `${leftBoundary}(?:${alts.join("|")})${rightBoundary}`
    return new RegExp(source, "iu")
}

function compileForLocale(locale: string): Compiled {
    const dict = markerSynonyms[locale] ?? markerSynonyms.en
    return {
        lose: buildRegexFromSynonyms(dict.lose),
        pickup: buildRegexFromSynonyms(dict.pickup),
        target: buildRegexFromSynonyms(dict.target),
        guaranteed: buildRegexFromSynonyms(dict.guaranteed),
    }
}

function compileGlobal(): Compiled {
    const agg = aggregateSynonyms()
    return {
        lose: buildRegexFromSynonyms(agg.lose),
        pickup: buildRegexFromSynonyms(agg.pickup),
        target: buildRegexFromSynonyms(agg.target),
        guaranteed: buildRegexFromSynonyms(agg.guaranteed),
    }
}

function getCompiled(key: string): Compiled {
    const hit = cache.get(key)
    if (hit) return hit
    const compiled =
        key === "__global__" ? compileGlobal() : compileForLocale(key)
    cache.set(key, compiled)
    return compiled
}

/**
 * detail.marker / detail.marker_code から指定マーカーの件数を数える
 * 既定は "全言語グローバル" 判定。marker_code があればコード優先。
 */
export function countMarkerInLog(
    marker: Marker,
    log: DateLog,
    options?: CountOptions,
): number {
    if (!log.drop_details || log.drop_details.length === 0) return 0

    const scope = options?.scope ?? "global"
    const localeKey =
        scope === "by-locale" ? options?.locale || "en" : "__global__"
    const { [marker]: re } = getCompiled(localeKey)

    return log.drop_details.reduce((acc, detail) => {
        // 将来用：構造化があれば最優先
        // if (detail.marker_code && detail.marker_code === marker) return acc + 1

        const src = detail.marker
        if (!src) return acc
        const norm = normalize(src)
        return acc + (re.test(norm) ? 1 : 0)
    }, 0)
}

export function classifyMarkerText(text: string): Marker | "other" {
    const compiled = getCompiled("__global__") // 全言語辞書で判定
    const norm = normalize(text)
    if (compiled.pickup.test(norm)) return "pickup"
    if (compiled.lose.test(norm)) return "lose"
    if (compiled.target.test(norm)) return "target"
    if (compiled.guaranteed.test(norm)) return "guaranteed"
    return "other"
}
