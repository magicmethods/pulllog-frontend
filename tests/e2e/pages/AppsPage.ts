import { expect, type Page } from "@playwright/test"
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

        const saveButton = appEditModal.getByRole("button", {
            name: uiText.save,
        })
        await expect(saveButton).toBeEnabled({ timeout: 15000 })
        await this.context.captureBeforeCommit("apps", "create-app")

        const createResponsePromise = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                response.url().includes("/api/apps"),
            { timeout: 15000 },
        )

        await Promise.all([
            appEditModal.waitFor({ state: "hidden", timeout: 15000 }),
            saveButton.click(),
        ])

        const createResponse = await createResponsePromise
        const createResponseText = await createResponse.text()
        expect(
            createResponse.ok(),
            `app create failed (${createResponse.status()}): ${createResponseText}`,
        ).toBeTruthy()

        const createdApp = JSON.parse(createResponseText) as Partial<AppData>
        if (!createdApp.appId) {
            throw new Error(
                `app create response did not include appId: ${createResponseText}`,
            )
        }

        await waitForLoaderToClear(page)
        await expect(page.getByText(appName).first()).toBeVisible({
            timeout: 30000,
        })
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

        const deleteUrl = new URL(`/api/apps/${appId}`, page.url()).toString()
        const csrfToken = await this.resolveCsrfToken(page)

        if (csrfToken) {
            const deleteResponse = await page.request.delete(deleteUrl, {
                headers: {
                    accept: "application/json",
                    "x-csrf-token": csrfToken,
                },
            })
            const deleteResponseText = await deleteResponse.text()

            if (deleteResponse.ok()) {
                this.context.note(
                    `Cleanup removed app after verification: ${appName ?? appId}`,
                )
                return
            }

            this.context.note(
                `Cleanup API fallback was required for ${appName ?? appId}: ${deleteResponse.status()} ${deleteResponseText}`,
            )
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

        const staleAppHeaders = page
            .locator("span.font-bold")
            .filter({ hasText: /^Playwright App / })

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
        const configButton = appCard.getByRole("button").first()

        await expect(appHeader).toBeVisible({ timeout: 15000 })
        await configButton.click()
        await page.getByRole("menuitem", { name: uiText.delete }).click()

        const deleteDialog = page.getByText(appName).locator("..").first()
        await expect(deleteDialog).toBeVisible({ timeout: 10000 })
        await page.getByRole("button", { name: uiText.delete }).last().click()
        await waitForLoaderToClear(page)
        await expect(page.getByText(appName).first()).toBeHidden({
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
        await registerHistoryButton.click()
    }
}
