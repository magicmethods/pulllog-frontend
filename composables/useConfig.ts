export function useConfig(): AppConfig {
    const config = useRuntimeConfig()
    return {
        appName: config.public.appName as string,
        appVersion: config.public.appVersion as string,
        appAuthor: config.public.appAuthor as string,
        defaultLocale: config.public.defaultLocale as Language,
        apiBaseURL: config.public.apiBaseURL as string,
        apiProxy: config.public.apiProxy as string,
        isDebug: config.public.isDebug as boolean,
        mockMode: config.public.mockMode as boolean,
    }
}
