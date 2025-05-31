const appConfig = useAppConfig()
export const API_BASE_URL = appConfig.apiBaseURL

/** RESTエンドポイント定義 */
export const endpoints = {
    auth: {
        login: () => `${API_BASE_URL}/auth/login`,
        logout: () => `${API_BASE_URL}/auth/logout`,
        refresh: () => `${API_BASE_URL}/auth/refresh`,
    },
    user: {
        profile: () => `${API_BASE_URL}/user/profile`,
        update: () => `${API_BASE_URL}/user/profile/update`,
    },
    apps: {
        list: () => `${API_BASE_URL}/apps`,
        detail: (appId: string | number) => `${API_BASE_URL}/apps/${appId}`,
        create: () => `${API_BASE_URL}/apps`,
        update: (appId: string | number) => `${API_BASE_URL}/apps/${appId}`,
        delete: (appId: string | number) => `${API_BASE_URL}/apps/${appId}`,
    },
    pulls: {
        history: () => `${API_BASE_URL}/pulls/history`,
        detail: (pullId: string | number) => `${API_BASE_URL}/pulls/${pullId}`,
        stats: () => `${API_BASE_URL}/pulls/stats`,
    },

}
