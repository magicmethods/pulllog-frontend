/**
 * アプリケ―ションデータ
 */
declare global {
    type AppData = {
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

}
export {}
