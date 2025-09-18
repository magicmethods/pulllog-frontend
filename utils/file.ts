import { ulid } from "ulid"

/**
 * CSVのヘッダ順（固定）
 * 既存エクスポート実装の並びを正とする
 */
export const CSV_HEADERS = Object.freeze([
    "date",
    "totalPulls",
    "dischargeItems",
    "expense",
    "dropDetails",
    "tags",
    "freeText",
]) as readonly string[]

/** 改行コードの推奨値を返す（WindowsはCRLF、その他はLF。判定不能時はLF） */
function getPreferredNewline(): string {
    try {
        if (typeof navigator === "undefined") return "\n"
        const ua = navigator.userAgent ?? ""
        const platform =
            (navigator as unknown as { platform?: string }).platform ?? ""
        const isWindows =
            /Windows|Win32|Win64|WOW64/i.test(ua) || /Win/i.test(platform)
        return isWindows ? "\r\n" : "\n"
    } catch {
        return "\n"
    }
}

/** CSVフィールドのクオートとエスケープ（常時クオート） */
function quoteCsv(value: string): string {
    return `"${value.replace(/"/g, '""')}"`
}

/** export用に値を正規化（null/undefinedは空文字、その他は文字列化） */
function normalizeExportValue(value: unknown): string {
    if (value === null || value === undefined) return ""
    if (typeof value === "string") return value
    return String(value)
}

/**
 * CSV形式の行を作成する
 * @param log 日次ログデータ
 * @returns CSV形式の文字列（常時クオート）
 */
function createCSVRow(log: DateLog): string {
    const rowData = {
        date: log.date,
        total_pulls: log.total_pulls,
        discharge_items: log.discharge_items,
        expense: log.expense,
        drop_details: JSON.stringify(log.drop_details),
        tags: JSON.stringify(log.tags),
        // null/undefined の場合に "null" を生成しないよう空へ正規化
        free_text: normalizeExportValue(log.free_text),
    }
    return Object.values(rowData)
        .map((v) => quoteCsv(normalizeExportValue(v)))
        .join(",")
}

/**
 * ダウンロード処理を実行する
 * @param data ダウンロード対象のデータ
 * @param settings ダウンロード設定
 * @returns 成功した場合はtrue、失敗した場合はfalse
 */
export function downloadFile(
    data: DateLog[],
    settings: HistoryDownloadSettings,
): boolean {
    if (!data || data.length === 0) {
        console.error("No data available for download.")
        return false
    }
    if (
        !settings ||
        !settings.format ||
        !["json", "csv"].includes(settings.format)
    ) {
        console.error("Invalid settings provided for download.")
        return false
    }

    // フォーマットに応じて処理を分岐
    let blob: Blob
    let url: string | null = null
    let fileName: string | null = null
    if (settings.format === "csv") {
        // CSVフォーマットのダウンロード処理
        const newline = getPreferredNewline()
        const headerRow = `${CSV_HEADERS.map((h) => quoteCsv(h)).join(",")}${newline}`
        const csvContent = data.map((log) => createCSVRow(log)).join(newline)
        const charset = "utf-8"

        blob = new Blob([`${headerRow}${csvContent}`], {
            type: `text/csv;charset=${charset}`,
        })
        url = URL.createObjectURL(blob)
        fileName = `pulllog-${ulid()}.csv`
    } else if (settings.format === "json") {
        // JSONフォーマットのダウンロード処理
        blob = new Blob([JSON.stringify(data)], { type: "application/json" })
        url = URL.createObjectURL(blob)
        fileName = `pulllog-${ulid()}.json`
    }

    if (!url || !fileName) {
        console.error("Failed to generate file for download.")
        return false
    }
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return true
}

/** CSVテキストを行列にパース（ダブルクオートの入れ子と改行を考慮） */
function parseCsv(text: string): string[][] {
    const input = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    const rows: string[][] = []
    let row: string[] = []
    let field = ""
    let inQuotes = false
    for (let i = 0; i < input.length; i++) {
        const ch = input[i]
        if (ch === '"') {
            if (inQuotes) {
                if (input[i + 1] === '"') {
                    field += '"'
                    i++
                } else {
                    inQuotes = false
                }
            } else {
                inQuotes = true
            }
            continue
        }
        if (ch === "," && !inQuotes) {
            row.push(field)
            field = ""
            continue
        }
        if (ch === "\n" && !inQuotes) {
            row.push(field)
            rows.push(row)
            row = []
            field = ""
            continue
        }
        field += ch
    }
    if (field.length > 0 || row.length > 0) {
        row.push(field)
        rows.push(row)
    }
    return rows
}

/** 行列からCSV文字列を生成（常時クオート・BOMなし） */
function stringifyCsv(rows: string[][], newline = "\n"): string {
    const lines: string[] = []
    for (const r of rows) {
        lines.push(r.map((v) => quoteCsv(v)).join(","))
    }
    return lines.join(newline)
}

/**
 * CSVファイルをアップロード用に正規化する
 * - freeText 列の "null"/"undefined"（前後空白許容・大小無視）を空文字に
 * - freeText 値は trim 後の文字列を採用
 * - ヘッダ順は CSV_HEADERS と完全一致を要求
 */
export async function prepareCsvForUpload(file: File): Promise<File> {
    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length === 0) throw new Error("CSV_EMPTY")
    const header = rows[0]
    if (
        header.length !== CSV_HEADERS.length ||
        !header.every((h, i) => h === CSV_HEADERS[i])
    ) {
        throw new Error("CSV_HEADER_MISMATCH")
    }
    const freeTextIdx = header.indexOf("freeText")
    const normalized: string[][] = [header]
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i]
        const next = [...r]
        if (next.length < header.length) next.length = header.length
        const current = (next[freeTextIdx] ?? "") as string
        const trimmed = current.trim()
        next[freeTextIdx] = /^(null|undefined)$/i.test(trimmed) ? "" : trimmed
        normalized.push(next.map((v) => v ?? ""))
    }
    const normalizedText = stringifyCsv(normalized, "\n")
    return new File([normalizedText], file.name, { type: "text/csv" })
}
