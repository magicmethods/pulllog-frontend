import { expect, type Page, type Response } from "@playwright/test"
import {
    dismissCookieBanner,
    uiText,
    waitForLoaderToClear,
} from "../support/shared-ui"
import type { E2EScenarioContext } from "../support/test"

/**
 * Encapsulates app-list interactions so route specs can stay declarative.
 */
export class AppsPage {
    constructor(private readonly context: E2EScenarioContext) {}

    /**
     * Ensures the requested app is visible in the app list.
     */
    async expectAppVisible(appName: string): Promise<void> {
        const page = this.context.page

        await page
            .waitForLoadState("networkidle", { timeout: 30000 })
            .catch(() => {})
        await waitForLoaderToClear(page)
        await dismissCookieBanner(page)
        await expect(page.getByText(appName).first()).toBeVisible({
            timeout: 45000,
        })
    }

    /**
     * Creates a new app entry for routes that need isolated test data.
     */
    async createApp(
        appName: string,
        nonce: string,
    ): Promise<{ appId: string; name: string }> {
        const page = this.context.page
        const publicUrl = `https://example.com/${nonce}`

        await waitForLoaderToClear(page)
        await dismissCookieBanner(page)
        await this.ensureCreationSlot()

        const addNewCard = page
            .locator("div.cursor-pointer")
            .filter({ hasText: uiText.addNew })
            .last()
        await expect(addNewCard).toBeVisible({ timeout: 15000 })
        await addNewCard.click()

        const appEditModal = page.locator("#appEditModal")
        await expect(appEditModal).toBeVisible({ timeout: 10000 })
        await waitForLoaderToClear(page)
        await this.context.captureCheckpoint("apps", "app-create-modal-open")

        await appEditModal.locator("#app_name").fill(appName)
        await appEditModal.locator("#public_url").fill(publicUrl)

        await expect(appEditModal.locator("#app_name")).toHaveValue(appName)
        await expect(appEditModal.locator("#public_url")).toHaveValue(publicUrl)

        const nameValidationError = appEditModal.getByText(
            /Application name must be within|アプリ名.*文字以内|应用名称.*字符/,
        )

        if (await nameValidationError.isVisible().catch(() => false)) {
            throw new Error(
                `app create form rejected generated app name "${appName}" before submit.`,
            )
        }

        const saveButton = appEditModal.getByRole("button", {
            name: uiText.save,
        })
        await expect(saveButton).toBeEnabled({ timeout: 15000 })
        await this.context.captureBeforeCommit("apps", "create-app")

        const createResponsePromise = page
            .waitForResponse(
                (response) => {
                    if (response.request().method() !== "POST") {
                        return false
                    }

                    const responseUrl = response.url()

                    return /\/api(?:\/v1)?\/apps(?:$|[/?#])/.test(responseUrl)
                },
                { timeout: 15000 },
            )
            .catch(() => null)

        await Promise.all([
            appEditModal.waitFor({ state: "hidden", timeout: 15000 }),
            saveButton.click(),
        ])

        const createdAppHeader = page
            .locator("span.font-bold", { hasText: appName })
            .first()

        await waitForLoaderToClear(page)
        await expect(createdAppHeader).toBeVisible({
            timeout: 30000,
        })

        const createdApp = await this.resolveCreatedApp(
            page,
            appName,
            await createResponsePromise,
        )

        await this.context.captureCheckpoint("apps", "app-created-visible")

        return {
            appId: createdApp.appId,
            name: createdApp.name ?? appName,
        }
    }

    /**
     * Removes an app created by the scenario so shared E2E state stays reusable.
     */
    async cleanupCreatedApp(appId: string, appName?: string): Promise<void> {
        const page = this.context.page
        await dismissCookieBanner(page)

        const appLabel = appName ?? appId
        const deletedViaApi = await this.deleteAppViaApi(page, appId, appLabel)

        if (deletedViaApi) {
            this.context.note(
                `Cleanup removed app after verification: ${appLabel}`,
            )
            return
        }

        if (!appName) {
            throw new Error(
                `app cleanup fallback requires appName for ${appId}`,
            )
        }

        await this.cleanupCreatedAppFromUi(appName)
        this.context.note(`Cleanup removed app after verification: ${appName}`)
    }

    /**
     * Ensures the shared E2E account still has room for a temporary app by removing stale Playwright-created entries.
     */
    private async ensureCreationSlot(): Promise<void> {
        const page = this.context.page
        const addNewCard = page
            .locator("div.cursor-pointer")
            .filter({ hasText: uiText.addNew })
            .last()

        if (await addNewCard.isVisible().catch(() => false)) {
            return
        }

        const removedViaApi = await this.cleanupStalePlaywrightAppsFromApi()

        if (removedViaApi > 0) {
            await page
                .reload({ waitUntil: "domcontentloaded", timeout: 30000 })
                .catch(() => {})
            await waitForLoaderToClear(page)
            await dismissCookieBanner(page)

            if (await addNewCard.isVisible().catch(() => false)) {
                return
            }
        }

        const staleAppHeaders = page
            .locator("span.font-bold")
            .filter({ hasText: /^Playwright /i })

        let staleCount = await staleAppHeaders.count()

        for (let index = 0; index < staleCount; index++) {
            if (await addNewCard.isVisible().catch(() => false)) {
                return
            }

            const staleName = (
                await staleAppHeaders.nth(0).textContent()
            )?.trim()

            if (!staleName) {
                break
            }

            await this.cleanupCreatedAppFromUi(staleName)
            await waitForLoaderToClear(page)
            await dismissCookieBanner(page)
            staleCount = await staleAppHeaders.count()
        }

        await expect(addNewCard).toBeVisible({ timeout: 15000 })
    }

    /**
     * Reads the runtime CSRF token from the hydrated Nuxt payload when cleanup needs an API call.
     */
    private async resolveCsrfToken(page: Page): Promise<string> {
        return await page.evaluate(() => {
            type NuxtRuntimeState = {
                payload?: {
                    state?: {
                        csrf?: {
                            token?: string
                        }
                    }
                    pinia?: {
                        csrf?: {
                            token?: string
                        }
                    }
                }
                state?: {
                    csrf?: {
                        token?: string
                    }
                }
            }

            const nuxt = (window as Window & { __NUXT__?: NuxtRuntimeState })
                .__NUXT__

            return (
                nuxt?.payload?.state?.csrf?.token ??
                nuxt?.state?.csrf?.token ??
                nuxt?.payload?.pinia?.csrf?.token ??
                ""
            )
        })
    }

    /**
     * Deletes stale Playwright-created apps through the API before falling back to UI interactions.
     */
    private async cleanupStalePlaywrightAppsFromApi(): Promise<number> {
        const page = this.context.page
        const apps = await this.listAppsFromApi(page)

        if (apps.length === 0) {
            return 0
        }

        let removedCount = 0

        for (const app of apps) {
            const staleAppId = typeof app.appId === "string" ? app.appId : ""
            const staleAppName = typeof app.name === "string" ? app.name : ""

            if (!staleAppId || !this.isPlaywrightManagedApp(staleAppName)) {
                continue
            }

            const deleted = await this.deleteAppViaApi(
                page,
                staleAppId,
                staleAppName,
            )

            if (deleted) {
                removedCount++
            }
        }

        if (removedCount > 0) {
            this.context.note(
                `Removed ${removedCount} stale Playwright app(s) before creation.`,
            )
        }

        return removedCount
    }

    /**
     * Resolves the created app from the create response when available, or by listing current apps as a fallback.
     */
    private async resolveCreatedApp(
        page: Page,
        appName: string,
        createResponse: Response | null,
    ): Promise<{ appId: string; name?: string }> {
        if (createResponse) {
            const createResponseText = await createResponse.text()
            expect(
                createResponse.ok(),
                `app create failed (${createResponse.status()}): ${createResponseText}`,
            ).toBeTruthy()

            const createdApp = JSON.parse(
                createResponseText,
            ) as Partial<AppData>

            if (createdApp.name) {
                expect(createdApp.name).toBe(appName)
            }

            if (createdApp.appId) {
                return {
                    appId: createdApp.appId,
                    name: createdApp.name ?? appName,
                }
            }
        }

        const apps = await this.listAppsFromApi(page)
        const matchedApp = apps.find((app) => app.name === appName)

        if (matchedApp?.appId) {
            return {
                appId: matchedApp.appId,
                name: matchedApp.name ?? appName,
            }
        }

        throw new Error(
            `created app "${appName}" became visible but its appId could not be resolved from the API response or the apps list.`,
        )
    }

    /**
     * Lists the current apps for the signed-in E2E user through the frontend API proxy.
     */
    private async listAppsFromApi(
        page: Page,
    ): Promise<Array<Partial<AppData>>> {
        const csrfToken = await this.resolveCsrfToken(page)

        if (!csrfToken) {
            return []
        }

        const listUrl = new URL("/api/apps", page.url()).toString()
        const listResponse = await page.request.get(listUrl, {
            headers: {
                accept: "application/json",
                "x-csrf-token": csrfToken,
            },
        })

        if (!listResponse.ok()) {
            return []
        }

        return (await listResponse.json().catch(() => [])) as Array<
            Partial<AppData>
        >
    }

    /**
     * Attempts to delete an app through the API using the active browser session.
     */
    private async deleteAppViaApi(
        page: Page,
        appId: string,
        appLabel: string,
    ): Promise<boolean> {
        const csrfToken = await this.resolveCsrfToken(page)

        if (!csrfToken) {
            return false
        }

        const deleteUrl = new URL(`/api/apps/${appId}`, page.url()).toString()
        const deleteResponse = await page.request.delete(deleteUrl, {
            headers: {
                accept: "application/json",
                "x-csrf-token": csrfToken,
            },
        })
        const deleteResponseText = await deleteResponse.text()

        if (deleteResponse.ok()) {
            return true
        }

        this.context.note(
            `Cleanup API fallback was required for ${appLabel}: ${deleteResponse.status()} ${deleteResponseText}`,
        )

        return false
    }

    /**
     * Identifies apps created by Playwright smoke runs so they can be cleaned safely.
     */
    private isPlaywrightManagedApp(appName: string): boolean {
        return /^Playwright /i.test(appName.trim())
    }

    /**
     * Falls back to the real apps UI when API cleanup cannot be completed directly.
     */
    private async cleanupCreatedAppFromUi(appName: string): Promise<void> {
        const page = this.context.page
        await dismissCookieBanner(page)

        const appHeader = page
            .locator("span.font-bold", { hasText: appName })
            .first()
        const appCard = appHeader.locator(
            'xpath=ancestor::div[contains(@class,"border") and contains(@class,"rounded-lg")][1]',
        )
        const configButton = appCard
            .locator('button[aria-haspopup="true"]')
            .first()

        await expect(appHeader).toBeVisible({ timeout: 15000 })
        await expect(configButton).toBeVisible({ timeout: 15000 })
        await configButton.click()
        await page.getByRole("menuitem", { name: uiText.delete }).click()

        const deleteDialog = page
            .locator('.p-dialog[role="dialog"]')
            .filter({ hasText: appName })
            .last()

        await expect(deleteDialog).toBeVisible({ timeout: 10000 })

        const confirmDeleteButton = deleteDialog.getByRole("button", {
            name: uiText.delete,
        })

        await expect(confirmDeleteButton).toBeEnabled({ timeout: 10000 })
        await confirmDeleteButton.click()

        await expect(deleteDialog).toBeHidden({ timeout: 30000 })
        await waitForLoaderToClear(page)
        await page
            .waitForLoadState("networkidle", { timeout: 15000 })
            .catch(() => {})
        await expect(appCard).toBeHidden({
            timeout: 30000,
        })
    }

    /**
     * Opens the history registration page from the selected app card.
     */
    async openHistoryRegistration(appName: string): Promise<void> {
        const page = this.context.page
        const appHeader = page
            .locator("span.font-bold", { hasText: appName })
            .first()
        const appCard = appHeader.locator(
            'xpath=ancestor::div[contains(@class,"border") and contains(@class,"rounded-lg")][1]',
        )

        await expect(appHeader).toBeVisible({ timeout: 15000 })
        await waitForLoaderToClear(page)

        const registerHistoryButton = appCard.getByRole("button", {
            name: uiText.registerHistory,
        })

        await expect(registerHistoryButton).toBeEnabled({ timeout: 15000 })

        await Promise.all([
            page.waitForURL(/\/history(?:\?.*)?$/, { timeout: 15000 }),
            registerHistoryButton.click(),
        ])
    }
}
