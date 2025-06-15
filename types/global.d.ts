/**
 * その他、UIでの加工や表示用の補助型
 */
/** カスタムコンポーネントから PrimeVue コンポーネントの PassThrough を取り扱うための型  */
// biome-ignore lint:/suspicious/noExplicitAny
type PassThroughValue = Record<string, any> | ((v: any) => Record<string, any>) 
/** カレンダー用日付データ */
type CalenderDate = Date | Date[] | (Date | null)[] | null | undefined
/** 検索・フィルタ用の事前加工: フィルタリングUIや曖昧検索用 */
type SearchableView = {
    searchLabel: string // 例: "あぷりめい（えん）"
}
