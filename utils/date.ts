/**
 * Format Datetime string
 * @param {string | number | Date} date
 * @param {string} [format='%Y-%m-%d']
 * @param {boolean} [utc=false] If true, use UTC time
 * @returns {string} Formatted Datetime string
 * @usage
 * ```
 * formatDate(new Date()) // -> `2025-02-06`
 * formatDate('2025-01-23T01:23:45.678', '%Y/%m/%d %H:%M:%S 100%%') // -> `2025/01/23 01:23:45 100%`
 * ```
 */
export function strFromDate(date: string | number | Date, format = '%Y-%m-%d', utc = false): string {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${date}`)

    const year = d.getFullYear().toString()
    const symbol: { [key: string]: string } = {
        '%Y': year,
        '%y': year.slice(-2),
        '%m': (d.getMonth() + 1).toString().padStart(2, '0'),
        '%d': d.getDate().toString().padStart(2, '0'),
        '%H': d.getHours().toString().padStart(2, '0'),
        '%M': d.getMinutes().toString().padStart(2, '0'),
        '%S': d.getSeconds().toString().padStart(2, '0'),
    }

    // 未知のフォーマットの場合
    const unknownFormats = format.match(/%[a-zA-Z]/g)?.filter(f => !(f in symbol))
    if (unknownFormats?.length) {
        throw new Error(`Unsupported format specifiers: ${unknownFormats.join(', ')}`)
    }

    // `%%` で `%*` をエスケープ可能
    return format.replace(/%%/g, '%').replace(/%[a-zA-Z]/g, v => symbol[v as keyof typeof symbol] || v)
}
