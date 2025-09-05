/**
 * その他、UIでの加工や表示用の補助型
 */
/** 言語 */
type Language = "ja" | "en" | "zh" // 追加言語はここに: 'ko' | 'fr' | 'es' | 'de' | 'it' | 'ru' | 'pt'
/** Runtime Config */
interface AppConfig {
    appName: string
    appVersion: string
    appAuthor: string
    defaultLocale: Language
    apiBaseURL: string
    apiProxy: string
    assetBaseURL: string // 外部アセット用ベースURL（R2, S3など）
    adsenseAccount: string // Google AdSense アカウントID
    gaId: string // Google Analytics ID
    googleClientId: string // Google OAuth クライアントID
    isDebug: boolean
    mockMode: boolean
}
/** パースされたクエリ情報 */
type QueryObject =
    | string
    | string[][]
    | Record<string, string>
    | URLSearchParams
    | undefined
/** テーマ名 */
type Theme = "light" | "dark"
/** カスタムコンポーネントから PrimeVue コンポーネントの PassThrough を取り扱うための型  */
// biome-ignore lint:/suspicious/noExplicitAny
type PassThroughValue = Record<string, any> | ((v: any) => Record<string, any>)
/** カレンダー用日付データ */
type CalenderDate = Date | Date[] | (Date | null)[] | null | undefined
/** 検索・フィルタ用の事前加工: フィルタリングUIや曖昧検索用 */
type SearchableView = {
    searchLabel: string // 例: "あぷりめい（えん）"
}
type BasicOption = { label: string; value: string }
// 通貨データの型
type CurrencyData = {
    code: string
    name: string
    symbol?: string
    symbol_native?: string
    minor_unit: number
    rounding: number
    name_plural?: string
}
/* 通貨データ（旧 utils/currency.ts の型）※破棄予定
type CurrencyData = {
    symbol: string; // 通貨記号
    name: string; // 通貨名
    symbol_native: string; // ネイティブ通貨記号
    decimal_digits: number; // 小数点以下の桁数
    rounding: number; // 四捨五入の単位
    code: string; // ISO通貨コード
    name_plural: string; // 複数形の通貨名
}
*/
type CurrencyResponse = {
    status: "success" | "error"
    data?: CurrencyData[]
    message?: string
}
type CurrencyOption = {
    label: string // 表示用ラベル
    value: string // 値（ISO通貨コード）
}
// ローダー表示用の情報型
type LoaderInfo = {
    text: string
    target: HTMLElement | null
}
// 広告埋め込みコンポーネントのProps
type AdItem = {
    image: string
    link?: string
    alt?: string
    text?: string // テキストバナー対応も可
    // 追加情報あればここに
}
type AdProps = {
    adWidth?: number
    adHeight?: number
    adText?: string
    adItems?: AdItem[]
    adHtml?: string
    adSlotName?: string
    adClient?: string
    adType?: "image" | "carousel" | "html" | "slot" | "none"
    adFormat?: string
    adResponsive?: string
    adStyle?: string
    disableForPlan?: string
}
