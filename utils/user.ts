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
