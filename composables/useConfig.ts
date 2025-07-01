export function useConfig(): AppConfig {
    const config = useRuntimeConfig()
    return {
        appName: config.public.appName as string,
        appVersion: config.public.appVersion as string,
        copyright: config.public.copyright as string,
        apiBaseURL: config.public.apiBaseURL as string,
        apiProxy: config.public.apiProxy as string,
        isDebug: config.public.isDebug as boolean,
        mockMode: config.public.mockMode as boolean,
    }
}
