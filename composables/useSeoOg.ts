import { useI18n } from "vue-i18n"
import {
    useHead,
    useNuxtApp,
    useRoute,
    useRuntimeConfig,
    useSeoMeta,
} from "#imports"
import type { SeoOgOptions, SeoRuntimeDefaults, UiLocale } from "~/types/seo"
import { toAbsoluteUrl, uiToOgLocale } from "~/types/seo"

/**
 * Helper to generate OGP/Twitter/canonical/hreflang.
 * - No dependency on useI18n. Safe in plugins or pages.
 */
export const useSeoOg = (opts: SeoOgOptions): void => {
    const route = useRoute()
    const nuxtApp = useNuxtApp()

    // runtime defaults
    const runtime = useRuntimeConfig()
    const defaults: SeoRuntimeDefaults = {
        siteUrl: String(runtime.public?.siteUrl || "https://pulllog.net"),
        siteName: String(
            (nuxtApp.$config as Record<string, unknown>)?.siteName || "PullLog",
        ),
        defaultOgImage: String(
            (nuxtApp.$config as Record<string, unknown>)?.defaultOgImage ||
                "/images/og_default.jpg",
        ),
        twitterHandle: String(
            (nuxtApp.$config as Record<string, unknown>)?.twitterHandle ||
                "@PullLog",
        ),
    }

    // decide locale first
    const { locale: i18nLocale, locales: i18nLocales, t } = useI18n()

    const guessLocaleFromPath = (): UiLocale => {
        const seg = (route.path.split("/")[1] || "").toLowerCase()
        if (seg === "en") return "en"
        if (seg === "zh") return "zh"
        return "ja"
    }
    const fromI18n = (
        typeof i18nLocale?.value === "string" ? i18nLocale.value : undefined
    ) as UiLocale | undefined
    const currentLocale = (opts.currentLocale ??
        fromI18n ??
        guessLocaleFromPath()) as UiLocale

    const candidateLocales =
        Array.isArray(opts.locales) && opts.locales.length > 0
            ? opts.locales
            : Array.isArray(i18nLocales)
              ? (i18nLocales as Array<string | { code: string }>).map((l) =>
                    typeof l === "string" ? l : l.code,
                )
              : ["ja", "en", "zh"]
    const allCodes: UiLocale[] = candidateLocales.filter(
        (c): c is UiLocale => c === "ja" || c === "en" || c === "zh",
    )

    // then paths/urls
    const pagePath = opts.path ?? route.path
    const canonicalUrl = toAbsoluteUrl(defaults.siteUrl, pagePath)

    // locale-specific OG image (translation override > locale default > global default)
    const overrideFromI18n = (() => {
        try {
            const val = t?.("seo.index.ogImage")
            return typeof val === "string" && val && val !== "seo.index.ogImage"
                ? val
                : undefined
        } catch {
            return undefined
        }
    })()
    const chosenImagePath =
        opts.imagePath ??
        overrideFromI18n ??
        (["ja", "en", "zh"].includes(currentLocale)
            ? `/images/og_default_${currentLocale}.jpg`
            : defaults.defaultOgImage)
    const imageUrl = toAbsoluteUrl(
        defaults.siteUrl,
        chosenImagePath || defaults.defaultOgImage,
    )

    const ogLocale = uiToOgLocale(currentLocale)
    const ogLocaleAlternate = allCodes
        .filter((c) => c !== currentLocale)
        .map(uiToOgLocale)

    // build hreflang links (prefer useLocalePath if available)
    const buildLocalizedPath = (code: UiLocale): string => {
        const maybeUseLocalePath:
            | undefined
            | (() => (p: string, l?: string) => string) = (
            globalThis as never as {
                useLocalePath?: () => (p: string, l?: string) => string
            }
        ).useLocalePath
        if (typeof maybeUseLocalePath === "function") {
            const localePath = maybeUseLocalePath()
            try {
                return localePath(pagePath, code)
            } catch {
                // fall back to simple concat
            }
        }
        const normalized = pagePath.startsWith("/") ? pagePath : `/${pagePath}`
        return `/${code}${normalized === "/" ? "" : normalized}`
    }

    const hreflangLinks = allCodes.map((code) => ({
        hreflang: code,
        href: toAbsoluteUrl(defaults.siteUrl, buildLocalizedPath(code)),
    }))

    const xDefaultHref = canonicalUrl

    useSeoMeta({
        title: opts.title,
        description: opts.description,
        ogType: "website",
        ogTitle: opts.title,
        ogDescription: opts.description,
        ogSiteName: defaults.siteName,
        ogUrl: canonicalUrl,
        ogImage: imageUrl,
        ogImageWidth: String(opts.imageWidth ?? 1200),
        ogImageHeight: String(opts.imageHeight ?? 630),
        ogLocale,
        ogLocaleAlternate: ogLocaleAlternate,
        twitterCard: "summary_large_image",
        twitterSite: defaults.twitterHandle,
        twitterTitle: opts.title,
        twitterDescription: opts.description,
        twitterImage: imageUrl,
    })

    useHead({
        link: [
            { rel: "canonical", href: canonicalUrl },
            ...hreflangLinks.map((l) => ({
                rel: "alternate",
                hreflang: l.hreflang,
                href: l.href,
            })),
            { rel: "alternate", hreflang: "x-default", href: xDefaultHref },
        ],
    })
}
