import path from "node:path"
import { defineConfig, devices } from "@playwright/test"

const frontendRoot = process.cwd()
const backendStableRoot = path.resolve(frontendRoot, "../backend/stable")
const testResultsRoot = path.resolve(frontendRoot, "tests/test-results")

const availableProjects = [
    {
        name: "chromium",
        use: { ...devices["Desktop Chrome"] },
    },
    {
        name: "firefox",
        use: { ...devices["Desktop Firefox"] },
    },
    {
        name: "webkit",
        use: { ...devices["Desktop Safari"] },
    },
    {
        name: "iphone-14",
        use: { ...devices["iPhone 14"] },
    },
    {
        name: "ipad-pro-11",
        use: { ...devices["iPad Pro 11"] },
    },
    {
        name: "android-pixel-7",
        use: { ...devices["Pixel 7"] },
    },
]

const projectAliases: Record<string, string> = {
    chrome: "chromium",
    chromium: "chromium",
    firefox: "firefox",
    safari: "webkit",
    webkit: "webkit",
    iphone: "iphone-14",
    "iphone-14": "iphone-14",
    ipad: "ipad-pro-11",
    "ipad-pro-11": "ipad-pro-11",
    android: "android-pixel-7",
    "android-pixel-7": "android-pixel-7",
}

const requestedProjectTokens = (
    process.env.PLAYWRIGHT_PROJECTS ??
    process.env.E2E_PROJECTS ??
    ""
)
    .split(/[\s,]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)

const requestedProjectNames = [
    ...new Set(
        requestedProjectTokens.map((token) => projectAliases[token] ?? token),
    ),
]

const unknownProjects = requestedProjectNames.filter(
    (name) => !availableProjects.some((project) => project.name === name),
)

if (unknownProjects.length > 0) {
    throw new Error(
        `Unknown Playwright project(s): ${unknownProjects.join(", ")}. Available projects: ${availableProjects
            .map((project) => project.name)
            .join(", ")}.`,
    )
}

const selectedProjects =
    requestedProjectNames.length > 0
        ? availableProjects.filter((project) =>
              requestedProjectNames.includes(project.name),
          )
        : availableProjects

/**
 * Playwright E2E は専用の `.env.e2e` で Nuxt を HTTPS 起動し、
 * Laravel バックエンドも `http://127.0.0.1:3030` で同時起動する。
 * `PLAYWRIGHT_PROJECTS=chromium,iphone` のように指定すると対象を絞り込める。
 */
export default defineConfig({
    testDir: "../e2e",
    // The golden route reuses a shared seeded account and backend state,
    // so browser/device projects should run serially to avoid session clashes.
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [
        ["line"],
        ["json", { outputFile: path.join(testResultsRoot, "result.json") }],
        [
            "html",
            {
                open: "never",
                outputFolder: path.join(testResultsRoot, "html-report"),
            },
        ],
        [
            path.resolve(
                frontendRoot,
                "tests/playwright/reporters/pulllog-e2e-reporter.ts",
            ),
            { outputDir: testResultsRoot },
        ],
    ],
    outputDir: path.join(testResultsRoot, "artifacts"),
    use: {
        baseURL: "https://127.0.0.1:4173",
        ignoreHTTPSErrors: true,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: selectedProjects,
    webServer: [
        {
            command: "composer run e2e:serve",
            cwd: backendStableRoot,
            url: "http://127.0.0.1:3030/up",
            reuseExistingServer: !process.env.CI,
            timeout: 120000,
            stdout: "ignore",
        },
        {
            command:
                "pnpm exec nuxt dev --dotenv .env.e2e --host 127.0.0.1 --port 4173",
            cwd: frontendRoot,
            url: "https://127.0.0.1:4173",
            reuseExistingServer: !process.env.CI,
            timeout: 180000,
            ignoreHTTPSErrors: true,
            stdout: "ignore",
            stderr: "ignore",
        },
    ],
})
