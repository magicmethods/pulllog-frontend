/** 
 * REST endpoint definition
 */
export const endpoints = {
    auth: {
        login:    () => `${useConfig().apiProxy}/auth/login`,  // POST
        register: () => `${useConfig().apiProxy}/auth/register`, // POST
        logout:   () => `${useConfig().apiProxy}/auth/logout`, // POST
        password: () => `${useConfig().apiProxy}/auth/password`, // POST
        verify:   () => `${useConfig().apiProxy}/auth/verify`, // POST
        updatePassword: () => `${useConfig().apiProxy}/auth/password`, // PUT
    },
    user: {
        profile: () => `${useConfig().apiProxy}/user/profile`, // GET
        create:  () => `${useConfig().apiProxy}/user/profile`, // POST
        update:  () => `${useConfig().apiProxy}/user/update`, // PUT
        //avatar:  () => `${useConfig().apiProxy}/user/avatar`,  // POST
    },
    apps: {
        list:   () => `${useConfig().apiProxy}/apps`, // GET
        detail: (appId: string | number) => `${useConfig().apiProxy}/apps/${appId}`, // GET
        create: () => `${useConfig().apiProxy}/apps`, // POST
        update: (appId: string | number) => `${useConfig().apiProxy}/apps/${appId}`, // PUT
        delete: (appId: string | number) => `${useConfig().apiProxy}/apps/${appId}`, // DELETE
        image:  (appId: string | number) => `${useConfig().apiProxy}/apps/${appId}/image`, // POST
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
            const query = new URLSearchParams()
            if (params) {
                if (params.from) query.append('from', params.from)
                if (params.to)   query.append('to', params.to)
                if (params.limit) query.append('limit', String(params.limit))
                if (params.offset) query.append('offset', String(params.offset))
            }
            const base = `${useConfig().apiProxy}/logs/${appId}`
            return query.toString() ? `${base}?${query.toString()}` : base
        }, // GET
        // @param date - YYYY-MM-DD format
        daily:  (appId: string | number, date: string) => `${useConfig().apiProxy}/logs/daily/${appId}/${date}`, // GET
        create: (appId: string | number, date: string) => `${useConfig().apiProxy}/logs/daily/${appId}/${date}`, // POST
        update: (appId: string | number, date: string) => `${useConfig().apiProxy}/logs/daily/${appId}/${date}`, // PUT
        delete: (appId: string | number, date: string) => `${useConfig().apiProxy}/logs/daily/${appId}/${date}`, // DELETE
        import: (appId: string | number, mode: 'overwrite' | 'merge') => `${useConfig().apiProxy}/logs/import/${appId}?mode=${mode}`, // POST
    },
    stats: {
        list: (appId: string | number, start: string, end: string) => {
            // Generate query parameters using URLSearchParams
            const query = new URLSearchParams()
            if (start) query.append('start', start)
            if (end) query.append('end', end)
            const base = `${useConfig().apiProxy}/stats/${appId}`
            return query.toString() ? `${base}?${query.toString()}` : base
        }, // GET
    }
}
