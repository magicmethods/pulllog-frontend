/**
 * APIレスポンスからユーザーオブジェクトを生成するユーティリティ関数
 * @param ur ユーザーレスポンス
 * @returns ユーザーオブジェクト
 */
export function toUser(ur: UserResponse): User {
    return {
        id: ur.id,
        name: ur.name,
        email: ur.email,
        avatarUrl: ur.avatar_url ?? null,
        roles: ur.roles ?? undefined,
        plan: ur.plan ?? undefined,
        planExpiration: ur.plan_expiration ?? undefined,
        language: ur.language,
        theme: ur.theme,
        homePage: ur.home_page ?? '/history',
        createdAt: ur.created_at,
        updatedAt: ur.updated_at,
        lastLogin: ur.last_login,
    }
}

/**
 * UserResponseからplan_limitsオブジェクトをUserPlanLimits型へ変換
 */
export function toUserPlanLimits(ur: UserResponse): UserPlanLimits | null {
    const pl = ur.plan_limits
    if (!pl) return null
    return {
        maxApps: pl.max_apps ?? 5,
        maxAppNameLength: pl.max_app_name_length ?? 30,
        maxAppDescriptionLength: pl.max_app_description_length ?? 400,
        maxLogTags: pl.max_log_tags ?? 5,
        maxLogTagLength: pl.max_log_tag_length ?? 22,
        maxLogTextLength: pl.max_log_text_length ?? 250,
        maxLogsPerApp: pl.max_logs_per_app,
        maxLogSize: pl.max_log_size,
        maxStorage: pl.max_storage,
    }
}

/**
 * ユーザーに応じた最大アプリ数を取得する（廃止予定）
 * @param user ユーザーオブジェクト
 * @returns 最大アプリ数
 */
export function getMaxApps(user: User | null): number {
    // ユーザープランに応じて最大アプリ数を返す
    if (!user) return 0 // 未ログインの場合などは0
    let fixedPlan = user.plan?.toLocaleLowerCase() || 'free' // プランが未設定の場合は無料プラン扱い
    if (user.planExpiration && new Date(user.planExpiration) < new Date()) {
        fixedPlan = 'free' // 有効期限切れのプランは無料プラン扱い
    }
    switch (fixedPlan) {
        case 'free':
            return 5 // 無料プランは5つまで
        case 'standard':
            return 10 // スタンダードプランは10個まで
        case 'premium':
            return 50 // プレミアムプランは50個まで
        default:
            return 0 // 不明なプランは0
    }
}

