import { defineConfig, devices } from "@playwright/test"

/**
 * Nuxt dev は --dotenv .env.local で HTTPS (自己署名証明書) で起動するため、
 * baseURL / webServer.url は https:// を使用し、ignoreHTTPSErrors を有効にする。
 */
export default defineConfig({
    testDir: "../e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ["list"],
        ["html", { open: "never", outputFolder: "../artifacts/html-report" }],
    ],
    outputDir: "../artifacts/test-results",
    use: {
        baseURL: "https://127.0.0.1:4173",
        ignoreHTTPSErrors: true,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command:
            "pnpm exec nuxt dev --dotenv .env.local --host 127.0.0.1 --port 4173",
        url: "https://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
        ignoreHTTPSErrors: true,
    },
})
