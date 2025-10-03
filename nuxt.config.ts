// https://nuxt.com/docs/api/configuration/nuxt-config
import fs from "node:fs"
import path from "node:path"
import { PrimeVueResolver } from "@primevue/auto-import-resolver"
import tailwindcssPostcss from "@tailwindcss/postcss"
import autoprefixer from "autoprefixer"
import Components from "unplugin-vue-components/vite"
import { PullLogPreset } from "./theme/preset"
import { ptPreset } from "./theme/ptPreset"

// Set paths of SSL Cert. and secret-key
const httpsOptions = {
    key: fs.readFileSync(
        path.resolve(__dirname, "public/localhost-key.pem"),
        "utf8",
    ),
    cert: fs.readFileSync(
        path.resolve(__dirname, "public/localhost.pem"),
        "utf8",
    ),
}

function sanitizeChunkName(name: string): string {
    return name
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase()
}

function resolvePrimevueChunk(id: string): string | null {
    const formsMatch = id.match(/[/]@primevue[/]forms[/](?:dist[/]esm[/])?(.+)/)
    if (formsMatch?.[1]) {
        const segments = formsMatch[1].split(/[/]/).filter(Boolean)
        if (segments.length > 0) {
            const formsKey =
                segments[0] === "components" && segments[1]
                    ? `component-${sanitizeChunkName(segments[1])}`
                    : segments[0]
            return `primevue-forms-${sanitizeChunkName(formsKey)}`
        }
        return "primevue-forms"
    }

    const themeMatch = id.match(
        /[/]@primeuix[/]themes[/](?:dist[/]esm[/])?(.+)/,
    )
    if (themeMatch?.[1]) {
        const segments = themeMatch[1].split(/[/]/).filter(Boolean)
        return `primevue-theme-${sanitizeChunkName(segments[0] ?? "core")}`
    }

    const coreMatch = id.match(/[/]@primevue[/]core[/](?:dist[/]esm[/])?(.+)/)
    if (coreMatch?.[1]) {
        const segments = coreMatch[1].split(/[/]/).filter(Boolean)
        if (segments.length > 0) {
            const [first, second] = segments
            if (first === "components" && second) {
                return `primevue-core-${sanitizeChunkName(second)}`
            }
            return `primevue-core-${sanitizeChunkName(first)}`
        }
        return "primevue-core"
    }

    const componentMatch = id.match(/[/]primevue[/](?:dist[/]esm[/])?(.+)/)
    if (componentMatch?.[1]) {
        const segments = componentMatch[1].split(/[/]/).filter(Boolean)
        if (segments.length > 0) {
            const [first, second] = segments
            if (first === "components" && second) {
                return `primevue-${sanitizeChunkName(second)}`
            }
            return `primevue-${sanitizeChunkName(first)}`
        }
        return "primevue-core"
    }

    if (/[\\/](?:primevue|@primevue|@primeuix)[\\/]/.test(id)) {
        return "primevue-core"
    }

    return null
}
export default defineNuxtConfig({
    compatibilityDate: "2025-05-15",
    nitro: {
        preset: "cloudflare_module", // SSR用 .output/server/wrangler.json が生成される 'cloudflare' はPages用
        minify: true,
        cloudflare: {
            deployConfig: true,
            nodeCompat: true,
            wrangler: {
                name: "pulllog",
                account_id: "ea07f43e5f337f658573df295d4dd6b1",
                workers_dev: false,
                routes: [
                    {
                        pattern: "*pulllog.net/*",
                        zone_name: "pulllog.net",
                    },
                ],
            },
        },
    },
    devtools: { enabled: false },
    typescript: {
        typeCheck: process.env.NUXT_TYPESCRIPT_CHECK !== "false",
        tsConfig: {
            include: ["types/**/*.d.ts"],
        },
    },
    ssr: true,
    runtimeConfig: {
        // サーバーサイド専用の環境変数
        apiBaseURL: process.env.API_BASE_URL,
        apiProxy: process.env.API_PROXY || "/api",
        secretApiKey: process.env.SECRET_API_KEY,
        demoEmail: process.env.DEMO_EMAIL,
        demoPassword: process.env.DEMO_PASSWORD,
        // クライアントサイドでも使用する環境変数
        public: {
            appName: process.env.APP_NAME,
            appVersion: process.env.APP_VERSION,
            appAuthor: process.env.APP_AUTHOR,
            defaultLocale: process.env.DEFAULT_LOCALE || "en",
            apiBaseURL: process.env.API_BASE_URL,
            apiProxy: process.env.API_PROXY || "/api",
            assetBaseURL: process.env.ASSET_BASE_URL,
            adsenseAccount: process.env.GOOGLE_ADSENSE_ACCOUNT,
            gaId: process.env.GA_ID,
            googleClientId: process.env.GOOGLE_CLIENT_ID,
            isDebug: process.env.IS_DEBUG === "true",
            mockMode: process.env.MOCK_MODE === "true",
            useFeatureFlag: process.env.USE_FEATURE_FLAG === "true",
            newFeatures: process.env.NEW_FEATURES ?? "",
        },
    },
    app: {
        baseURL: "/",
        head: {
            link: [
                { rel: "preconnect", href: "https://fonts.googleapis.com" },
                {
                    rel: "preconnect",
                    href: "https://fonts.gstatic.com",
                    crossorigin: "",
                },
                {
                    rel: "stylesheet",
                    href: "https://fonts.googleapis.com/css2?family=BIZ+UDGothic:wght@400;700&family=M+PLUS+Rounded+1c:wght@100;400&family=Nunito:ital,wght@0,200..700;1,200..700&display=swap",
                },
            ],
        },
    },
    css: [
        "@/assets/styles/primeicons.css",
        "@loadingio/loading.css/loading.css",
        "@/assets/styles/tailwind_v4.scss",
        "@/assets/styles/index.scss",
    ],
    modules: ["@pinia/nuxt", "@primevue/nuxt-module", "@nuxtjs/i18n"],
    hooks: {
        "components:extend"(components) {
            for (let i = components.length - 1; i >= 0; i--) {
                if (
                    components[i].filePath?.includes(
                        "vite/modulepreload-polyfill.js",
                    )
                ) {
                    components.splice(i, 1)
                }
            }
        },
        "imports:extend"(imports) {
            for (let i = imports.length - 1; i >= 0; i--) {
                if (imports[i].from === "vite/modulepreload-polyfill.js") {
                    imports.splice(i, 1)
                }
            }
        },
    },
    devServer: {
        host: "pull.log",
        port: 4649,
        https: httpsOptions,
    },
    experimental: {
        payloadExtraction: false,
    },
    vite: {
        build: {
            sourcemap: process.env.NUXT_SOURCEMAP === "true",
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (!id.includes("node_modules")) {
                            return undefined
                        }

                        if (
                            id.includes("chart.js") ||
                            id.includes("chartjs-plugin") ||
                            id.includes("vue-chartjs")
                        ) {
                            return "chart"
                        }

                        if (/(?:^|[\\/])primeicons[\\/]/.test(id)) {
                            return "primeicons"
                        }

                        const primevueChunk = resolvePrimevueChunk(id)
                        if (primevueChunk) {
                            return primevueChunk
                        }

                        if (id.includes("luxon")) {
                            return "luxon"
                        }

                        if (
                            id.includes("vue-i18n") ||
                            id.includes("@intlify")
                        ) {
                            return "i18n"
                        }

                        return undefined
                    },
                },
            },
            chunkSizeWarningLimit: 1200,
        },
        plugins: [
            Components({
                resolvers: [PrimeVueResolver()],
                dts: true,
            }),
        ],
        css: {
            postcss: {
                plugins: [tailwindcssPostcss, autoprefixer()],
            },
            preprocessorOptions: {
                scss: {
                    additionalData: "",
                    sourceMapContents: true,
                    quietDeps: false,
                    silenceDeprecations: ["legacy-js-api"],
                },
            },
        },
        server: {
            https: httpsOptions,
            watch: {
                ignored: [
                    "**/.git/**",
                    "**/.github/**",
                    "**/.husky/**",
                    "**/.wrangler/**",
                    "**/.codex/**",
                    "**/AGENTS.md",
                    "**/logs/**",
                    "**/tmp/**",
                    "**/*.log",
                    "**/.DS_Store",
                    "**/dist/**",
                    "**/.nuxt/**",
                    "**/.output/**",
                    "**/.vscode/**",
                    "**/coverage/**",
                ],
            },
        },
    },
    primevue: {
        usePrimeVue: true,
        autoImport: true,
        components: {
            exclude: [
                "Dialog",
                "Drawer",
                "DataTable",
                "Column",
                "ColumnGroup",
                "FileUpload",
                "Editor",
            ],
        },
        options: {
            theme: {
                preset: PullLogPreset,
                options: {
                    darkModeSelector: ".app-dark",
                    cssLayer: {
                        name: "primevue",
                        order: "tailwind-base, primevue, tailwind-components, tailwind-utilities",
                    },
                },
            },
            pt: ptPreset,
            ptOptions: {
                mergeSections: true,
                mergeProps: true,
            },
        },
    },
    i18n: {
        bundle: {
            optimizeTranslationDirective: false,
        },
        strategy: "no_prefix",
        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: "pulllog-lang",
            redirectOn: "root",
            alwaysRedirect: false,
        },
        locales: [
            { code: "ja", language: "ja-JP", name: "Japanese", file: "ja.ts" },
            { code: "en", language: "en-US", name: "English", file: "en.ts" },
            { code: "zh", language: "zh-CN", name: "简体中文", file: "zh.ts" },
        ],
        defaultLocale: "ja",
        lazy: false,
        langDir: "./locales",
    },
})
