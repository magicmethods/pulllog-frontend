import { DateTime } from "luxon"

/**
 * カレンダー日付型を YYYY-MM-DD 形式の文字列に変換
 * @param {CalenderDate} dateValue
 * @returns {string} YYYY-MM-DD 形式の文字列
 * @description
 * - type CalenderDate = string | number | Date | Date[] | (Date | null)[]
 * - luxon 非依存のメソッド
 */
export function formatDate(dateValue: CalenderDate): string {
    let _d = null
    if (Array.isArray(dateValue)) {
        for (const v of dateValue) {
            if (v instanceof Date) _d = v
            break
        }
    } else if (dateValue instanceof Date) {
        _d = dateValue
    }
    if (!_d) return "" // 日付が無効な場合は空文字を返す
    return `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`
}

/**
 * Format Datetime string
 * @param {string | number | Date} date
 * @param {string} [format='%Y-%m-%d']
 * @param {boolean} [utc=false] If true, use UTC time
 * @returns {string} Formatted Datetime string
 * @usage
 * ```
 * strFromDate(new Date()) // `2025-02-06`
 * strFromDate('2025-01-23T01:23:45.678', '%Y/%m/%d %H:%M:%S 100%%') // `2025/01/23 01:23:45 100%`
 * strFromDate(1700000000000, '%y-%m-%d', true) // タイムスタンプ
 * ```
 */
export function strFromDate(
    date: string | number | Date,
    format = "%Y-%m-%d",
    utc = false,
): string {
    // 入力の正規化
    let dt: DateTime
    if (typeof date === "string" || typeof date === "number") {
        dt = DateTime.fromJSDate(new Date(date), {
            zone: utc ? "utc" : "local",
        })
    } else if (date instanceof Date) {
        dt = DateTime.fromJSDate(date, { zone: utc ? "utc" : "local" })
    } else {
        throw new Error(`Invalid date: ${date}`)
    }
    if (!dt.isValid) throw new Error(`Invalid date: ${date}`)
    //const d = new Date(date)
    //if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${date}`)

    const year = dt.year.toString() // d.getFullYear().toString()
    const symbol: { [key: string]: string } = {
        "%Y": year,
        "%y": year.slice(-2),
        "%m": dt.month.toString().padStart(2, "0"), // (d.getMonth() + 1).toString().padStart(2, '0'),
        "%d": dt.day.toString().padStart(2, "0"), // d.getDate().toString().padStart(2, '0'),
        "%H": dt.hour.toString().padStart(2, "0"), // d.getHours().toString().padStart(2, '0'),
        "%M": dt.minute.toString().padStart(2, "0"), // d.getMinutes().toString().padStart(2, '0'),
        "%S": dt.second.toString().padStart(2, "0"), // d.getSeconds().toString().padStart(2, '0'),
    }

    // 未知のフォーマットの場合
    const unknownFormats = format
        .match(/%[a-zA-Z]/g)
        ?.filter((f) => !(f in symbol))
    if (unknownFormats?.length) {
        throw new Error(
            `Unsupported format specifiers: ${unknownFormats.join(", ")}`,
        )
    }

    // `%%` で `%*` をエスケープ可能
    return format
        .replace(/%%/g, "%")
        .replace(/%[a-zA-Z]/g, (v) => symbol[v as keyof typeof symbol] || v)
}

// Private: 合計ユーティリティ
function sum(arr: number[]) {
    return arr.reduce((a, b) => a + (b || 0), 0)
}

// Private: ラベル整形ユーティリティ
function formatLabel(
    format: string,
    context: Record<string, string | number>,
): string {
    return format
        .replace(/%d/g, String(context.day ?? ""))
        .replace(/%1d/g, String(context.startDay ?? ""))
        .replace(/%2d/g, String(context.endDay ?? ""))
        .replace(/%w/g, String(context.week ?? ""))
        .replace(/%Y/g, String(context.year ?? ""))
        .replace(/%m/g, String(context.month ?? ""))
}

/**
 * X軸ラベル＆データグリッド生成
 * @param {ChartDataPoint[]} data - チャートデータポイントの配列
 * @param {number} range - 日数範囲（例: 30日）
 * @param {string} [startDate] - 開始日（YYYY-MM-DD形式）
 * @param {number} [step=1] - 日数ごとのグループ化単位（例: 1=日次, 7=週次, 30=月次）
 * @param {string} [labelFormat] - ラベルフォーマット（例: "%d", "%1d～%2d週", "%m月"）
 * @returns {{ labels: string[], points: ChartDataPoint[] }}
 * @description
 * - `labels`: X軸ラベルの配列
 * - `points`: グループ化されたデータポイントの配列
 * @usage
 * ```ts
 * import { getLabelsAndMap } from '~/utils/date'
 * const { labels, points } = getLabelsAndMap(data, 30, '2025-01-01', 7, '%1d～%2d週')
 *
 * getLabelsAndMap(data, 30) // 1日ごと30日分（本日を終点）
 * getLabelsAndMap(data, 91, undefined, 7, '第%w週') // 7日ごとに91日分（本日を終点）で週番号をラベルに
 * getLabelsAndMap(data, 182, undefined, 14, '%1d〜%2d週') // 14日ごとに182日分（本日を終点）で週番号をラベルに
 * getLabelsAndMap(data, 31, '2025-05-01') // 2025年5月1日から31日分（2025-05-01〜2025-05-31）
 * ```
 */
export function getLabelsAndMap(
    data: ChartDataPoint[],
    range: number, // 日数
    startDate?: string, // YYYY-MM-DD
    step = 1, // 日数ごとのグループ化単位（1=日次, 7=週次, 30=月次など）
    labelFormat?: string, // 例: "%d", "%1d～%2d週", "%m月"
): { labels: string[]; points: ChartDataPoint[] } {
    // 範囲の始点・終点算出
    let end: DateTime
    let start: DateTime
    if (startDate) {
        start = DateTime.fromISO(startDate)
        end = start.plus({ days: range - 1 })
    } else {
        end = DateTime.now().endOf("day")
        start = end.minus({ days: range - 1 })
    }

    // グリッド生成
    const grids: {
        start: DateTime
        end: DateTime
        context: Record<string, string | number>
    }[] = []
    for (let s = start; s <= end; s = s.plus({ days: step })) {
        const e = s.plus({ days: step - 1 }).startOf("day")
        const gridEnd = e > end ? end : e
        const ctx: Record<string, string | number> = {
            startDay: s.toFormat("M/d"),
            endDay: gridEnd.toFormat("M/d"),
            day: s.toFormat("M/d"),
            week: s.weekNumber,
            year: s.year,
            month: s.month,
        }
        grids.push({ start: s, end: gridEnd, context: ctx })
    }

    // データグループ化＆集計
    const points = grids.map((g) => {
        const group = data.filter((d) => {
            const dt = DateTime.fromISO(d.date).startOf("day")
            return dt >= g.start.startOf("day") && dt <= g.end.endOf("day")
        })
        // 日次データの場合、合計値を算出
        const total_pulls = group.length
            ? sum(group.map((x) => Number(x.total_pulls)))
            : 0
        const rare_pulls = group.length
            ? sum(group.map((x) => Number(x.rare_pulls)))
            : 0
        const expense = group.length
            ? sum(group.map((x) => Number(x.expense)))
            : 0
        const other_pulls = total_pulls - rare_pulls
        return {
            date: g.start.toISODate(),
            total_pulls,
            rare_pulls,
            other_pulls,
            expense,
        }
    }) as ChartDataPoint[]

    // ラベル生成
    const labels = grids.map((g) =>
        labelFormat
            ? formatLabel(labelFormat, g.context)
            : step === 1
              ? g.start.toFormat("M/d")
              : `${g.start.toFormat("M/d")}～${g.end.toFormat("M/d")}`,
    )

    //console.log('getLabelsAndMap', labels, points)
    return { labels, points }
}
