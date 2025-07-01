/**
 * ユーザーデータ
 */
declare global {
    type User = {
        id?: number // 将来的に必要なら使用
        name: string // ユーザー名（表示名）
        email: string // メールアドレス（=ログインID）
        password?: string // ログインパスワード（パスワード更新時のみ新規パスワードが入る）
        avatarUrl?: string | null // アバター画像URL（nullの場合はデフォルト画像を使用）
        roles?: string[] // ユーザーの役割
        plan?: string // ユーザープラン
        planExpiration?: string // プランの有効期限: YYYY-MM-DD形式の文字列
        language: string // ユーザーの言語設定（ja, enなど）
        theme: string // ユーザーのテーマ設定（light, darkなど）
        homePage?: string // ログイン後に表示されるページ（ルートパス）
        createdAt: string // ユーザー登録日時: YYYY-MM-DDTHH:mm:ss形式
        updatedAt: string // ユーザー情報更新日時: YYYY-MM-DDTHH:mm:ss形式
        lastLogin: string // 最終ログイン日時: YYYY-MM-DDTHH:mm:ss形式
    }
    /** バックエンドAPIからのレスポンス型（必要なら） */
    type UserResponse = {
        id: number // ユーザーID: ユーザー登録時に発行される insertId (シーケンシャル番号)
        name: string
        email: string
        avatar_url?: string | null // アバター画像URL
        roles?: string[] // ユーザーの役割（admin, userなど）
        plan?: string // ユーザープラン（free, proなど）
        plan_expiration?: string // プランの有効期限: YYYY-MM-DD形式の文字列
        language: string // ユーザーの言語設定
        theme: string // ユーザーのテーマ設定
        home_page?: string // ログイン後に表示されるページ
        created_at: string // ユーザー登録日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
        updated_at: string // ユーザー情報更新日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
        last_login: string // 最終ログイン日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
        last_login_ip?: string // 最終ログインIPアドレス: IPv4形式の文字列
        last_login_user_agent?: string // 最終ログインユーザーエージェント: ユーザーエージェント文字列
        is_deleted: boolean // ユーザーが削除されたかどうかのフラグ（論理削除用）
        is_verified: boolean // ユーザーがメールアドレスを確認したかどうかのフラグ（メール認証用）
        unread_notifications?: number[] // 未読通知数（通知IDの配列）
        [key: string]: unknown
    }
    /** ログインレスポンス */
    type LoginResponse = {
        state: 'success' | 'error'
        message?: string
        user: UserResponse | null
        csrfToken: string | null
    } | null
    /** 登録レスポンス */
    type RegisterResponse = {
        state: 'success' | 'error'
        message?: string
    } | null
    /** パスワードリセットレスポンス */
    type PasswordResetResponse = {
        success: boolean
        message?: string
    } | null
    /** ユーザー情報更新レスポンス */
    type UserUpdateResponse = {
        state: 'success' | 'error'
        message?: string
        user: UserResponse | null
    } | null
}
export {}
