import { AppsPage } from "./pages/AppsPage"
import { AuthPage } from "./pages/AuthPage"
import { HistoryPage } from "./pages/HistoryPage"
import { ShellPage } from "./pages/ShellPage"
import { StatsPage } from "./pages/StatsPage"
import {
    describeManifestProjectOverride,
    type E2ECaseManifest,
    getCaseManifest,
    shouldRunCase,
    shouldRunCaseOnProject,
} from "./support/case-manifest"
import { type E2EScenarioContext, expect, test } from "./support/test"

const appName = "Genshin Impact"
const authAppsManifest = getCaseManifest("auth-apps-smoke")
const signupValidationManifest = getCaseManifest(
    "auth-email-signup-validation-smoke",
)
const signupDuplicateManifest = getCaseManifest(
    "auth-email-signup-duplicate-email",
)
const signupRequestManifest = getCaseManifest("auth-email-signup-request-smoke")
const appsCreateManifest = getCaseManifest("apps-create-smoke")
const historySaveLogManifest = getCaseManifest("history-save-log")
const statsAggregationManifest = getCaseManifest("stats-aggregation-smoke")
const logoutDrawerManifest = getCaseManifest("logout-drawer-smoke")

test.describe("manifest-driven core E2E flows", () => {
    caseTest(
        signupValidationManifest,
        "validate representative email-signup guardrails",
        async (scenario) => {
            const authPage = new AuthPage(scenario)

            scenario.note(
                "Representative signup validation coverage: invalid email, short password, and missing terms agreement.",
            )

            await authPage.validateEmailSignupGuardrails()
            await expect(scenario.page).toHaveURL(/\/auth\/register(?:\?.*)?$/)
        },
    )

    caseTest(
        signupDuplicateManifest,
        "reject a duplicate email signup request",
        async (scenario) => {
            const authPage = new AuthPage(scenario)
            const duplicateEmail =
                await authPage.submitDuplicateEmailSignupRequest()

            scenario.note(`Duplicate signup target email: ${duplicateEmail}`)

            await expect(scenario.page).toHaveURL(/\/auth\/register(?:\?.*)?$/)
        },
    )

    caseTest(
        signupRequestManifest,
        "submit a new email signup request",
        async (scenario) => {
            const authPage = new AuthPage(scenario)
            const submittedEmail = await authPage.submitEmailSignupRequest()

            scenario.note(
                `Submitted email signup request for: ${submittedEmail}`,
            )

            await expect(scenario.page).toHaveURL(/\/auth\/register(?:\?.*)?$/)
        },
    )

    caseTest(
        authAppsManifest,
        "sign in and land on the apps page",
        async (scenario) => {
            const authPage = new AuthPage(scenario)
            const appsPage = new AppsPage(scenario)

            scenario.note(`Seeded app reused for the case: ${appName}`)

            await authPage.loginAndOpenApps()
            await appsPage.expectAppVisible(appName)
            await expect(scenario.page).toHaveURL(/\/apps(?:\?.*)?$/)
        },
    )

    caseTest(
        appsCreateManifest,
        "create a new app from the apps page",
        async (scenario) => {
            const nonce = Date.now().toString().slice(-8)
            const createdAppName = `Playwright create ${nonce}`
            const authPage = new AuthPage(scenario)
            const appsPage = new AppsPage(scenario)
            let createdAppId: string | null = null

            scenario.note(`Created app for this case: ${createdAppName}`)

            await authPage.loginAndOpenApps()

            try {
                const createdApp = await appsPage.createApp(
                    createdAppName,
                    nonce,
                )
                createdAppId = createdApp.appId
                await expect(scenario.page).toHaveURL(/\/apps(?:\?.*)?$/)
            } finally {
                if (createdAppId) {
                    await appsPage.cleanupCreatedApp(
                        createdAppId,
                        createdAppName,
                    )
                }
            }
        },
    )

    caseTest(
        historySaveLogManifest,
        "save a daily history entry",
        async (scenario) => {
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
        },
    )

    caseTest(
        statsAggregationManifest,
        "render aggregated stats",
        async (scenario) => {
            const authPage = new AuthPage(scenario)
            const appsPage = new AppsPage(scenario)
            const statsPage = new StatsPage(scenario)

            scenario.note(`Seeded app reused for the case: ${appName}`)

            await authPage.loginAndOpenApps()
            await appsPage.expectAppVisible(appName)
            await statsPage.openFromHeader()
            await statsPage.waitUntilReady(appName)
            await statsPage.showCharts(appName)
        },
    )

    caseTest(
        logoutDrawerManifest,
        "switch preferences and logout",
        async (scenario) => {
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
        },
    )
})

type CaseScenarioHandler = (scenario: E2EScenarioContext) => Promise<void>

function caseTest(
    manifest: E2ECaseManifest,
    title: string,
    handler: CaseScenarioHandler,
): void {
    test.describe(`[${manifest.id}]`, () => {
        if (manifest.execution?.retries !== undefined) {
            test.describe.configure({ retries: manifest.execution.retries })
        }

        test(title, async ({ scenario }) => {
            activateCase(scenario, manifest)
            await handler(scenario)
        })
    })
}

function activateCase(
    scenario: E2EScenarioContext,
    manifest: E2ECaseManifest,
): void {
    scenario.useCaseManifest(manifest)

    const currentProjectName = test.info().project.name
    const filteredByProject = !shouldRunCaseOnProject(
        manifest,
        currentProjectName,
    )
    const projectOverride = describeManifestProjectOverride(manifest)

    test.skip(
        !shouldRunCase(manifest, { projectName: currentProjectName }),
        filteredByProject && projectOverride
            ? `Case ${manifest.id} is limited to project(s): ${projectOverride}. Current project: ${currentProjectName}.`
            : `Case ${manifest.id} is filtered out by the active E2E manifest filters.`,
    )

    if (manifest.execution?.timeoutMs) {
        test.setTimeout(manifest.execution.timeoutMs)
    }
}
