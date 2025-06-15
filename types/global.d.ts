/**
 * API通信のリクエストパラメータ型
 */
type AllowMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type RequestParams = Record<string, string | number | boolean | Array<string | number | boolean>>
// biome-ignore lint:/suspicious/noExplicitAny
type RequestData = Record<string, any>
/** API呼び出しオプション (composables/useAPI.ts) */
type CallApiOptions = {
    endpoint: string
    method: AllowMethod
    params?: RequestParams
    data?: RequestData
    retries?: number // デフォルト0
    cacheTime?: number // ms, デフォルト0
    overrideURI?: boolean
    debug?: boolean
    timeout?: number // 秒単位, デフォルト10
    extraHeaders?: Record<string, string>
    requestInit?: RequestInit
}

/**
 * DataModel （保存用型）
 */
/** ユーザーデータ */
type User = {
    id: number // ユーザーID: ユーザー登録時に発行される insertId (シーケンシャル番号)
    name: string // ユーザー名（表示名）
    email: string // メールアドレス（=ログインID）
    avatar_url?: string | null // アバター画像URL（nullの場合はデフォルト画像を使用）
    roles?: string[] // ユーザーの役割（admin, userなど）
    plan?: string // ユーザープラン（free, proなど）
    plan_expiration?: string // プランの有効期限: YYYY-MM-DD形式の文字列
    language: string // ユーザーの言語設定（ja, enなど）
    theme: string // ユーザーのテーマ設定（light, darkなど）
    created_at: string // ユーザー登録日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
    updated_at: string // ユーザー情報更新日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
    last_login: string // 最終ログイン日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
    last_login_ip?: string // 最終ログインIPアドレス: IPv4形式の文字列
    last_login_user_agent?: string // 最終ログインユーザーエージェント: ユーザーエージェント文字列
    is_deleted: boolean // ユーザーが削除されたかどうかのフラグ（論理削除用）
    is_verified: boolean // ユーザーがメールアドレスを確認したかどうかのフラグ（メール認証用）
    unread_notifications?: number[] // 未読通知数（通知IDの配列）
}
/** アプリケ―ションデータ */
type AppData = {
    //userId?: number // ユーザーID: ユーザー登録時に発行される insertId (AUTO_INCREMENT？)。アプリの一意性は userId + appId で担保される
    name: string // アプリ名
    appId: string // ULID 形式の文字列（ユーザー毎に一意な値） フロントエンドで発行処理を行う
    url: string | null // アプリURL
    description: string | null // アプリ説明テキスト（maxLength: 400）
    date_update_time: string | null // HH:mm形式の時刻文字列
    sync_update_time: boolean // true の場合、UI側の日付切替時刻を当日の date_update_time に変更する
    currency_unit: string | null // 通貨単位の文字列: optionStore.currencyOptions から選択された要素の label の文字列
    pity_system?: boolean // レア排出保証システム（天井）の有無 c.f. "guaranteed gacha" とも呼ばれる
    guarantee_count?: number // レア排出保証回数（ガチャ天井の回数）※ pity_system が true の場合のみ有効
    rarity_defs?: SymbolOption[] // レアリティ定義の配列: optionStore.rarityOptions をそのまま使用
    marker_defs?: SymbolOption[] // マーキング定義の配列: optionStore.symbolOptions をそのまま使用
    task_defs?: SymbolOption[] // タスク定義の配列: optionStore.taskOptions をそのまま使用（将来的な機能）
}
type ValidateAppData = AppData & { raw_date_update_time: Date | null }
/** 各種オプション定義型（通貨単位・レアリティ・マーキング等） */
type SymbolOption = {
    icon?: string | null
    symbol?: string | null
    label: string
    value: string // 同一オプション内で一意な値。新規追加時は ULID 形式の文字列としてフロントエンドで発行
    desc?: string
    order?: number
}
/** 排出詳細: 日付ログデータの一部 */
type DropDetail = {
    rarity: string | null // レアリティ: optionStore.rarityOptions の label
    name: string | null // 排出アイテム名
    marker: string | null // マーキング: optionStore.symbolOptions の label
}
/** 日付ログデータ */
type DateLog = {
    //userId?: number // ユーザーID: ログはユーザー毎に管理される。ログの一意性は userId + appId + date で担保される
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
    total_logs: number // 集計期間中の登録ログ数
    months_in_period: number // 集計期間中の月数
    total_pulls: number // ガチャ回数の合計値
    rare_drop_count: number // レア排出数
    rare_drop_rate: number // レア排出率
    total_expense: number // ガチャにかかった費用の合計値
    average_monthly_expense: number // 月毎の平均費用
    average_expense: number // レア排出1回あたりの平均費用
    average_rare_drop_rate: number // レア排出率の平均値（レア排出１回あたりのガチャ回数）
}
interface StatsData {
    appId: string
    startDate: string
    endDate: string
    totalPulls: number
    rareDropCount: number
    rareDropRate: number
    totalExpense: number
    averageExpense: number
    averageRareDropRate: number
    // 追加項目: [今後拡張可能]
    totalLogs?: number // 集計期間中の登録ログ数
    monthsInPeriod?: number // 集計期間中の月数
    averageMonthlyExpense?: number // 月毎の平均費用
}

/**
 * ViewModel （UIでの加工や表示用の補助型）
 */
/** カスタムコンポーネントから PrimeVue コンポーネントの PassThrough を取り扱うための型  */
// biome-ignore lint:/suspicious/noExplicitAny
type PassThroughValue = Record<string, any> | ((v: any) => Record<string, any>) 
/** カレンダー用日付データ */
type CalenderDate = Date | Date[] | (Date | null)[] | null | undefined
/** アプリケーションデータ（UI制御用 → × 廃止） */
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
/** チャート用 */
type ChartRange = '1m' | '3m' | '6m' | '1y'
type RangeOption = {
    label: string
    value: ChartRange
    days: number
    startDate?: string // YYYY-MM-DD形式
    endDate?: string // YYYY-MM-DD形式
}
type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'polarArea' | 'bubble' | 'scatter'
type ChartDataPoint = {
    date: string // YYYY-MM-DD形式
    [key: string]: number | string // その他のキーは数値または文字列
}
type SeriesSetting = {
    key: string
    label: string
    type: ChartType
    backgroundColor?: string
    borderColor?: string
    stack?: string
    yAxisID?: string
    tension?: number
    fill?: boolean
}
