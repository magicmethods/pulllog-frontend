/**
 * その他、UIでの加工や表示用の補助型
 */
/** Runtime Config */
interface AppConfig {
    appName: string
    appVersion: string
    copyright: string
    apiBaseURL: string
    apiProxy: string
    isDebug: boolean
    mockMode: boolean
}
/** パースされたクエリ情報 */
type QueryObject = string | string[][] | Record<string, string> | URLSearchParams | undefined
/** テーマ名 */
type Theme = 'light' | 'dark'
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
// 通貨データ（通貨定義 utils/currency.ts で使用）
type CurrencyData = {
    symbol: string; // 通貨記号
    name: string; // 通貨名
    symbol_native: string; // ネイティブ通貨記号
    decimal_digits: number; // 小数点以下の桁数
    rounding: number; // 四捨五入の単位
    code: string; // ISO通貨コード
    name_plural: string; // 複数形の通貨名
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
    adType?: 'image' | 'carousel' | 'html' | 'slot'
    disableForPlan?: string
}
