
type AllowMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type RequestParams = Record<string, string | number | boolean | Array<string | number | boolean>>
type RequestData = Record<string, unknown>

/**
 * UIコンポーネント制御用
 */
/** カレンダー用日付データ */
type CalenderDate = Date | Date[] | (Date | null)[] | null | undefined
/** アプリケ―ションデータ */
type App = {
    name: string
    value: string // appId
    url: string
}
/** 排出詳細 */
type DropDetail = {
    rarity: string | null
    name: string
    symbol: string
}
/** マーキング */
type SymbolOption = {
    label: string
    value: string
    symbol: string
}