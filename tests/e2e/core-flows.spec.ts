import { AppsPage } from "./pages/AppsPage"
import { AuthPage } from "./pages/AuthPage"
import { HistoryPage } from "./pages/HistoryPage"
import { ShellPage } from "./pages/ShellPage"
import { StatsPage } from "./pages/StatsPage"
import {
    type E2ECaseManifest,
    getCaseManifest,
    shouldRunCase,
} from "./support/case-manifest"
import { type E2EScenarioContext, expect, test } from "./support/test"

const appName = "Genshin Impact"
const authAppsManifest = getCaseManifest("auth-apps-smoke")
const appsCreateManifest = getCaseManifest("apps-create-smoke")
const historySaveLogManifest = getCaseManifest("history-save-log")
const statsAggregationManifest = getCaseManifest("stats-aggregation-smoke")
const logoutDrawerManifest = getCaseManifest("logout-drawer-smoke")

test.describe("manifest-driven core E2E flows", () => {
    test(`[${authAppsManifest.id}] sign in and land on the apps page`, async ({
        scenario,
    }) => {
        activateCase(scenario, authAppsManifest)

        const authPage = new AuthPage(scenario)
        const appsPage = new AppsPage(scenario)

        scenario.note(`Seeded app reused for the case: ${appName}`)

        await authPage.loginAndOpenApps()
        await appsPage.expectAppVisible(appName)
        await expect(scenario.page).toHaveURL(/\/apps(?:\?.*)?$/)
    })

    test(`[${appsCreateManifest.id}] create a new app from the apps page`, async ({
        scenario,
    }) => {
        activateCase(scenario, appsCreateManifest)

        const nonce = Date.now().toString().slice(-8)
        const createdAppName = `Playwright App ${nonce}`
        const authPage = new AuthPage(scenario)
        const appsPage = new AppsPage(scenario)
        let createdAppId: string | null = null

        scenario.note(`Created app for this case: ${createdAppName}`)

        await authPage.loginAndOpenApps()

        try {
            const createdApp = await appsPage.createApp(createdAppName, nonce)
            createdAppId = createdApp.appId
            await expect(scenario.page).toHaveURL(/\/apps(?:\?.*)?$/)
        } finally {
            if (createdAppId) {
                await appsPage.cleanupCreatedApp(createdAppId, createdAppName)
            }
        }
    })

    test(`[${historySaveLogManifest.id}] save a daily history entry`, async ({
        scenario,
    }) => {
        activateCase(scenario, historySaveLogManifest)

        const nonce = Date.now().toString().slice(-8)
        const note = `History save note ${nonce}`
        const authPage = new AuthPage(scenario)
        const appsPage = new AppsPage(scenario)
        const historyPage = new HistoryPage(scenario)

        scenario.note(`Seeded app reused for the case: ${appName}`)

        await authPage.loginAndOpenApps()
        await appsPage.expectAppVisible(appName)
        await appsPage.openHistoryRegistration(appName)
        await historyPage.waitUntilReady(appName)
        await historyPage.saveLog({
            totalPullCount: "10",
            dischargedItems: "1",
            expense: "25",
            note,
        })
    })

    test(`[${statsAggregationManifest.id}] render aggregated stats`, async ({
        scenario,
    }) => {
        activateCase(scenario, statsAggregationManifest)

        const authPage = new AuthPage(scenario)
        const appsPage = new AppsPage(scenario)
        const statsPage = new StatsPage(scenario)

        scenario.note(`Seeded app reused for the case: ${appName}`)

        await authPage.loginAndOpenApps()
        await appsPage.expectAppVisible(appName)
        await statsPage.openFromHeader()
        await statsPage.waitUntilReady(appName)
        await statsPage.showCharts(appName)
    })

    test(`[${logoutDrawerManifest.id}] switch preferences and logout`, async ({
        scenario,
    }) => {
        activateCase(scenario, logoutDrawerManifest)

        const authPage = new AuthPage(scenario)
        const appsPage = new AppsPage(scenario)
        const shellPage = new ShellPage(scenario)

        scenario.note(`Seeded app reused for the case: ${appName}`)

        await authPage.loginAndOpenApps()
        await appsPage.expectAppVisible(appName)
        await shellPage.openSettingsDrawer()
        await shellPage.switchLanguageAndThemeForSnapshot()
        await shellPage.restoreDefaultPreferences()
        await shellPage.logout()

        await expect(scenario.page).toHaveURL(/\/auth\/login(?:\?.*)?$/)
        await expect(
            scenario.page.getByText(
                /Please enter your login information|ログイン情報を入力してください|请输入登录信息/,
            ),
        ).toBeVisible()
    })
})

function activateCase(
    scenario: E2EScenarioContext,
    manifest: E2ECaseManifest,
): void {
    scenario.useCaseManifest(manifest)

    test.skip(
        !shouldRunCase(manifest),
        `Case ${manifest.id} is filtered out by the active E2E manifest filters.`,
    )

    if (manifest.execution?.timeoutMs) {
        test.setTimeout(manifest.execution.timeoutMs)
    }
}
