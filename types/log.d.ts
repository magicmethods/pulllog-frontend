/**
 * ログデータ
 */
declare global {
    /** 排出詳細: 日付ログデータの一部 */
    type DropDetail = {
        rarity: string | null // レアリティ: optionStore.rarityOptions の label
        name: string | null // 排出アイテム名
        marker: string | null // マーキング: optionStore.symbolOptions の label
    }
    /** 日付ログデータ */
    type DateLog = {
        appId: string // アプリケーションID: ユーザー毎に一意な値
        date: string // 記録対象となる日付: YYYY-MM-DD形式の文字列
        total_pulls: number // 対象日のガチャ回数の合計値
        discharge_items: number // 対象日のレア排出数の合計値
        drop_details: DropDetail[] // 対象日のレア排出詳細の配列
        expense: number // 対象日のガチャにかかった費用の合計値
        tags: string[] // 付与されたタグ文字列の配列（日次ログ毎に最大3つまで）
        free_text: string // フリーテキスト（maxLength: 200）
        images: string[] // 添付画像のファイルパスの配列（日次ログ毎に最大n個まで）（将来的な機能）
        tasks: string[] // 完了したタスク名の配列: タスク名は optionStore.taskOptions の label を想定 （将来的な機能）
        last_updated: string | null // 最終更新日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
    }
    /** 推移グラフ・履歴一覧用データ */
    type HistoryData = Map<string, DateLog[]> // キーは appId で、値は日付ログの配列（アプリ毎に日付ログが管理される）
    /** 日付ログの一覧表示用サマリー: 日次履歴など */
    type DateLogSummaryView = {
        date: string
        totalPulls: number
        dischargeItems: number
        expense: number
        tags: string[]
        displayLabel: string // e.g. "2025-04-29: 100連 ¥30,000"
    }
    /** ログ取得条件オプション */
    type FetchLogsOptions = {
        fromDate?: string // 取得範囲の開始日 YYYY-MM-DD形式
        toDate?: string // 取得範囲の終了日 YYYY-MM-DD形式
        limit?: number // 取得件数（デフォルトは無制限）
        offset?: number
    }
    /** ログキャッシュのMap型 */
    type LogsMap = Map<string, Map<string, DateLog>> // appId -> date -> DateLog
    type LogsListMap = Map<string, Map<string, DateLog[]>> // appId -> queryKey -> DateLog[]
    /** 履歴ダウンロード用設定 */
    type HistoryDownloadSettings = {
        format: 'csv' | 'json'
        includeImages: boolean
        dateRange: {
            start: string
            end: string
        }
    }

}
export {}
