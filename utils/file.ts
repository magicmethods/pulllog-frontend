import { ulid } from 'ulid'

/*
type DateLog = {
    appId: string;
    date: string;
    total_pulls: number;
    discharge_items: number;
    drop_details: DropDetail[];
    expense: number;
    tags: string[];
    free_text: string;
    images: string[];
    tasks: string[];
    last_updated: string | null;
} */

/**
 * CSV形式の行を作成する
 * @param log 日次ログデータ
 * @returns CSV形式の文字列
 */
function createCSVRow(log: DateLog): string {
    const rowData = {
        date: log.date,
        total_pulls: log.total_pulls,
        discharge_items: log.discharge_items,
        expense: log.expense,
        drop_details: JSON.stringify(log.drop_details),
        tags: JSON.stringify(log.tags),
        free_text: log.free_text,
        //images: log.images.join(';'),
        //tasks: log.tasks.join(';'),
        //last_updated: log.last_updated || ''
    }
    return Object.values(rowData).map(value => {
        // CSVの値はダブルクオートで囲み、内部のダブルクオートはエスケープする
        return `"${String(value).replace(/"/g, '""')}"`
    }).join(',')
}

/**
 * ダウンロード処理を実行する
 * @param data ダウンロード対象のデータ
 * @param settings ダウンロード設定
 * @returns 成功した場合はtrue、失敗した場合はfalse
 */
export function downloadFile(data: DateLog[], settings: HistoryDownloadSettings): boolean {
    if (!data || data.length === 0) {
        console.error('No data available for download.')
        return false
    }
    if (!settings || !settings.format || !['json', 'csv'].includes(settings.format)) {
        console.error('Invalid settings provided for download.')
        return false
    }

    // フォーマットに応じて処理を分岐
    let blob: Blob
    let url: string | null = null
    let fileName: string | null = null
    if (settings.format === 'csv') {
        // CSVフォーマットのダウンロード処理
        const headerRow = `"${[
            'date',
            'totalPulls',
            'dischargeItems',
            'expense',
            'dropDetails',
            'tags',
            'freeText',
        ].join('","')}"\n`
        const csvContent = data.map(log => {
            return createCSVRow(log)
        }).join('\n')
        const charset = 'utf-8'

        blob = new Blob([`${headerRow}${csvContent}`], { type: `text/csv;charset=${charset}` })
        url = URL.createObjectURL(blob)
        fileName = `pulllog-${ulid()}.csv`
    } else if (settings.format === 'json') {
        // JSONフォーマットのダウンロード処理
        blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
        url = URL.createObjectURL(blob)
        fileName = `pulllog-${ulid()}.json`
    }
    
    if (!url || !fileName) {
        console.error('Failed to generate file for download.')
        return false
    }
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return true
}
