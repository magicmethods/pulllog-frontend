export function useConsent() {
    const grant = () => {
        window.gtag?.("consent", "update", {
            ad_storage: "granted",
            analytics_storage: "granted",
        })
    }
    const deny = () => {
        window.gtag?.("consent", "update", {
            ad_storage: "denied",
            analytics_storage: "denied",
        })
    }
    return { grant, deny }
}
