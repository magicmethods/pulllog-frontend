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
        homePage: ur.home_page ?? "/history",
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
        maxApps: pl.maxApps ?? 5,
        maxAppNameLength: pl.maxAppNameLength ?? 30,
        maxAppDescriptionLength: pl.maxAppDescriptionLength ?? 400,
        maxLogTags: pl.maxLogTags ?? 5,
        maxLogTagLength: pl.maxLogTagLength ?? 22,
        maxLogTextLength: pl.maxLogTextLength ?? 250,
        maxLogsPerApp: pl.maxLogsPerApp,
        maxLogSize: pl.maxLogSize,
        maxStorage: pl.maxStorage,
    }
}
