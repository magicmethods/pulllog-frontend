/** 
 * REST endpoint definition
 */
export const endpoints = {
    auth: {
        login:    () => `${useAppConfig().apiBaseURL}/auth/login`,  // POST
        register: () => `${useAppConfig().apiBaseURL}/auth/register`, // POST
        logout:   () => `${useAppConfig().apiBaseURL}/auth/logout`, // POST
        password: () => `${useAppConfig().apiBaseURL}/auth/password`, // POST
    },
    user: {
        profile: () => `${useAppConfig().apiBaseURL}/user/profile`, // GET
        create:  () => `${useAppConfig().apiBaseURL}/user/profile`, // POST
        update:  () => `${useAppConfig().apiBaseURL}/user/profile`, // PUT
        avatar:  () => `${useAppConfig().apiBaseURL}/user/avatar`,  // POST
    },
    apps: {
        list:   () => `${useAppConfig().apiBaseURL}/apps`, // GET
        detail: (appId: string | number) => `${useAppConfig().apiBaseURL}/apps/${appId}`, // GET
        create: () => `${useAppConfig().apiBaseURL}/apps`, // POST
        update: (appId: string | number) => `${useAppConfig().apiBaseURL}/apps/${appId}`, // PUT
        delete: (appId: string | number) => `${useAppConfig().apiBaseURL}/apps/${appId}`, // DELETE
        image:  (appId: string | number) => `${useAppConfig().apiBaseURL}/apps/${appId}/image`, // POST
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
            // Generate query parameters using URLSearchParams
            const url = new URL(`${useAppConfig().apiBaseURL}/logs/${appId}`)
            if (params) {
                if (params.from) url.searchParams.append('from', params.from)
                if (params.to)   url.searchParams.append('to', params.to)
                if (params.limit) url.searchParams.append('limit', String(params.limit))
                if (params.offset) url.searchParams.append('offset', String(params.offset))
            }
            return url.toString()
        }, // GET
        // @param date - YYYY-MM-DD format
        daily:  (appId: string | number, date: string) => `${useAppConfig().apiBaseURL}/logs/daily/${appId}/${date}`, // GET
        create: (appId: string | number, date: string) => `${useAppConfig().apiBaseURL}/logs/daily/${appId}/${date}`, // POST
        update: (appId: string | number, date: string) => `${useAppConfig().apiBaseURL}/logs/daily/${appId}/${date}`, // PUT
        delete: (appId: string | number, date: string) => `${useAppConfig().apiBaseURL}/logs/daily/${appId}/${date}`, // DELETE
    },
    stats: {
        list: (appId: string | number, start: string, end: string) => {
            // Generate query parameters using URLSearchParams
            const url = new URL(`${useAppConfig().apiBaseURL}/stats/${appId}`)
            url.searchParams.append('start', start)
            url.searchParams.append('end', end)
            return url.toString()
        }, // GET
    }
}
