/**
 * API通信のリクエストパラメータ型
 */
type AllowMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type RequestParams = Record<string, string | number | boolean | Array<string | number | boolean>>
type RequestData = Record<string, unknown>

/**
 * DataModel （保存用型）
 */
/** アプリケ―ションデータ */
type AppData = {
    userId: number // ユーザーID: ユーザー登録時に発行される insertId (AUTO_INCREMENT？)
    name: string // アプリ名
    appId: string // ULID 形式の文字列（ユーザー毎に一意な値） フロントエンドで発行処理を行う
    url: string | null // アプリURL
    description: string | null // アプリ説明テキスト（maxLength: 400）
    date_update_time: string | null // HH:mm形式の時刻文字列
    sync_update_time?: boolean // true の場合、UI側の日付切替時刻を当日の date_update_time に変更する
    currency_unit: string | null // 通貨単位の文字列: optionStore.currencyOptions から選択された要素の label の文字列
    rarity_defs: SymbolOption[] // レアリティ定義の配列: optionStore.rarityOptions をそのまま使用
    marker_defs: SymbolOption[] // マーキング定義の配列: optionStore.symbolOptions をそのまま使用
    task_defs: SymbolOption[] // タスク定義の配列: optionStore.taskOptions をそのまま使用（将来的な機能）
}
/** 各種オプション定義型（通貨単位・レアリティ・マーキング等） */
type SymbolOption = {
    icon?: string | null
    symbol?: string | null
    label: string
    value?: string // 同一オプション内では一意に識別される必要がある
    desc?: string
    order?: number
}
/** 排出詳細: 日付ログデータの一部 */
type DropDetail = {
    rarity: string | null // レアリティ: optionStore.rarityOptions の label を想定
    name: string | null // 排出アイテム名
    symbol: string | null // マーキング: optionStore.symbolOptions の symbol + label を想定
}
/** 日付ログデータ */
type DateLog = {
    userId: number // ユーザーID: ログはユーザー毎に管理される
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
// TODO: 全アプリを横断した履歴データはどうするか？
// TODO: 期間を指定しての履歴データ取得はどうするか？
/** 統計用データ: まだ素案段階 */
type StatisticsData = {
    start_date: string // 集計開始日: YYYY-MM-DD形式の文字列
    end_date: string // 集計終了日: YYYY-MM-DD形式の文字列
    total_pulls: number // ガチャ回数の合計値
    rare_drop_count: number // レア排出数
    rare_drop_rate: number // レア排出率
    total_expense: number // ガチャにかかった費用の合計値
    average_expense: number // ガチャ1回あたりの平均費用
    average_rare_drop_rate: number // レア排出率の平均値（レア排出１回あたりのガチャ回数？）
}

/**
 * ViewModel （UIでの加工や表示用の補助型）
 */
/** カスタムコンポーネントから PrimeVue コンポーネントの PassThrough を取り扱うための型  */
// biome-ignore lint:/suspicious/noExplicitAny
type PassThroughValue = Record<string, any> | ((v: any) => Record<string, any>) 
/** カレンダー用日付データ */
type CalenderDate = Date | Date[] | (Date | null)[] | null | undefined
/** アプリケーションデータ（UI制御用） */
type App = {
    name:  string
    value: string // = AppData.appId
    url:   string
}
/** 排出詳細: 表示用 */
type DropDetailView = DropDetail & {
    rarityDisplay?: string // e.g. "⭐SSR"
    symbolDisplay?: string // e.g. "🎯狙い"
}
/** ComboBox, Chip表示用 */
type SymbolOptionView = SymbolOption & {   
    /** UI表示用のラベル（symbol+labelなど） */
    displayLabel: string
}
/** アプリ選択UI */
type AppView = AppData & {
    /** 表示用に整形したラベル */
    displayLabel: string
}
/** 日付ログの一覧表示用サマリー: 日次履歴など */
type DateLogSummaryView = {
    date: string
    totalPulls: number
    dischargeItems: number
    expense: number
    tags: string[]
    displayLabel: string // e.g. "2025-04-29: 100連 ¥30,000"
}
/** 統計データのグラフ/テーブル対応: 統計ページなど */
type StatisticsView = StatisticsData & {
    rareDropRatePercent: string // "7.5%" 等
    averageExpensePerPull: string // "¥300/回" 等
}
/** 検索・フィルタ用の事前加工: フィルタリングUIや曖昧検索用 */
type SearchableView = {
    searchLabel: string // 例: "あぷりめい（えん）"
}
