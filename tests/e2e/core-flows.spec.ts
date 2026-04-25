import { AppsPage } from "./pages/AppsPage"
import { AuthPage } from "./pages/AuthPage"
import { GalleryPage } from "./pages/GalleryPage"
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
const galleryDetailSaveDeleteManifest = getCaseManifest(
    "gallery-detail-save-delete",
)
const galleryUploadInvalidFormatManifest = getCaseManifest(
    "gallery-upload-invalid-format",
)
const galleryUploadTooLargeManifest = getCaseManifest(
    "gallery-upload-too-large",
)
const galleryUploadDirectManifest = getCaseManifest("gallery-upload-direct")
const galleryRuntimeManifest = getCaseManifest("gallery-runtime-smoke")
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
        galleryRuntimeManifest,
        "sign in and land on the gallery page with healthy runtime APIs",
        async (scenario) => {
            const authPage = new AuthPage(scenario)
            const galleryPage = new GalleryPage(scenario)

            scenario.note(
                "This case isolates gallery runtime health from direct upload and FE-G5 detail actions.",
            )

            await authPage.loginAndOpenApps()
            await galleryPage.openAndExpectRuntimeHealthy()
        },
    )

    caseTest(
        galleryDetailSaveDeleteManifest,
        "verify gallery detail fetch, save update, and delete",
        async (scenario) => {
            const authPage = new AuthPage(scenario)
            const galleryPage = new GalleryPage(scenario)

            scenario.note(
                "This case verifies FE-G5 detail/save/delete on local-dev and requires a disposable pre-seeded gallery asset for the standard user.",
            )

            await authPage.loginAndOpenApps()
            await galleryPage.ensureDisposableAssetForActiveAccount()
            await galleryPage.openAndExpectRuntimeHealthy()
            await galleryPage.verifyDetailSaveDelete()
        },
    )

    caseTest(
        galleryUploadDirectManifest,
        "verify gallery direct upload against the local backend",
        async (scenario) => {
            const authPage = new AuthPage(scenario)
            const galleryPage = new GalleryPage(scenario)

            scenario.note(
                "This case rechecks the non-mock gallery upload path on the local-dev existing-server lane and cleans up the uploaded asset at the end.",
            )

            await authPage.loginAndOpenApps()
            await galleryPage.openAndExpectRuntimeHealthy()
            await galleryPage.verifyDirectUpload()
        },
    )

    caseTest(
        galleryUploadInvalidFormatManifest,
        "reject an unsupported gallery upload format",
        async (scenario) => {
            const authPage = new AuthPage(scenario)
            const galleryPage = new GalleryPage(scenario)

            scenario.note(
                "This case verifies that unsupported image MIME types are rejected at upload-ticket time on the local-dev lane.",
            )

            await authPage.loginAndOpenApps()
            await galleryPage.openAndExpectRuntimeHealthy()
            await galleryPage.verifyUploadTicketRejected({
                fixtureName: "invalidFormatGif",
                expectedStatus: 422,
                titlePrefix: "FE-G4-UPLOAD-FORMAT",
            })
        },
    )

    caseTest(
        galleryUploadTooLargeManifest,
        "reject an oversized gallery upload",
        async (scenario) => {
            const authPage = new AuthPage(scenario)
            const galleryPage = new GalleryPage(scenario)

            scenario.note(
                "This case verifies that a file above the plan upload limit is rejected at upload-ticket time on the local-dev lane.",
            )

            await authPage.loginAndOpenApps()
            await galleryPage.openAndExpectRuntimeHealthy()
            await galleryPage.verifyUploadTicketRejected({
                fixtureName: "invalidTooLargeJpg",
                expectedStatus: 422,
                titlePrefix: "FE-G4-UPLOAD-SIZE",
            })
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
