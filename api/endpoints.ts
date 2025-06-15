const appConfig = useAppConfig()
export const API_BASE_URL = appConfig.apiBaseURL

/** RESTエンドポイント定義 */
export const endpoints = {
    auth: {
        login:   () => `${API_BASE_URL}/auth/login`,
        logout:  () => `${API_BASE_URL}/auth/logout`,
        refresh: () => `${API_BASE_URL}/auth/refresh`,
    },
    user: {
        profile: () => `${API_BASE_URL}/user/profile`,
        update:  () => `${API_BASE_URL}/user/profile/update`,
    },
    apps: {
        list:   () => `${API_BASE_URL}/apps`, // GET
        detail: (appId: string | number) => `${API_BASE_URL}/apps/${appId}`, // GET
        create: () => `${API_BASE_URL}/apps`, // POST
        update: (appId: string | number) => `${API_BASE_URL}/apps/${appId}`, // PUT
        delete: (appId: string | number) => `${API_BASE_URL}/apps/${appId}`, // DELETE
    },
    logs: {
        list: (
            appId: string | number,
            params?: {
                from?: string // YYYY-MM-DD
                to?: string // YYYY-MM-DD
                limit?: number
                offset?: number
            }
        ) => {
            // URLSearchParamsを使ってクエリパラメータを生成
            const url = new URL(`${API_BASE_URL}/logs/${appId}`)
            if (params) {
                if (params.from) url.searchParams.append('from', params.from)
                if (params.to)   url.searchParams.append('to', params.to)
                if (params.limit) url.searchParams.append('limit', String(params.limit))
                if (params.offset) url.searchParams.append('offset', String(params.offset))
            }
            return url.toString()
        }, // GET
        // @param date - YYYY-MM-DD format
        daily:  (appId: string | number, date: string) => `${API_BASE_URL}/logs/daily/${appId}/${date}`, // GET
        create: (appId: string | number, date: string) => `${API_BASE_URL}/logs/daily/${appId}/${date}`, // POST
        update: (appId: string | number, date: string) => `${API_BASE_URL}/logs/daily/${appId}/${date}`, // PUT
        delete: (appId: string | number, date: string) => `${API_BASE_URL}/logs/daily/${appId}/${date}`, // DELETE
    },
    stats: {
        list: (appId: string | number, start: string, end: string) => {
            // URLSearchParamsを使ってクエリパラメータを生成
            const url = new URL(`${API_BASE_URL}/stats/${appId}`)
            url.searchParams.append('start', start)
            url.searchParams.append('end', end)
            return url.toString()
        }, // GET
    }
}
