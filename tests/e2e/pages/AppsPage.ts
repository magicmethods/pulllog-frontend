import { expect } from "@playwright/test"
import { uiText, waitForLoaderToClear } from "../support/shared-ui"
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

        await waitForLoaderToClear(page)
        await expect(page.getByText(uiText.addNew)).toBeVisible({
            timeout: 15000,
        })
        await expect(page.getByText(appName).first()).toBeVisible({
            timeout: 30000,
        })
    }

    /**
     * Creates a new app entry for routes that need isolated test data.
     */
    async createApp(appName: string, nonce: string): Promise<void> {
        const page = this.context.page
        const publicUrl = `https://example.com/${nonce}`

        await waitForLoaderToClear(page)

        const addNewCard = page
            .locator("div.cursor-pointer")
            .filter({ hasText: uiText.addNew })
            .last()
        await expect(addNewCard).toBeVisible({ timeout: 15000 })
        await addNewCard.click()

        const appEditModal = page.locator("#appEditModal")
        await expect(appEditModal).toBeVisible({ timeout: 10000 })
        await waitForLoaderToClear(page)

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

        await waitForLoaderToClear(page)
        await expect(page.getByText(appName).first()).toBeVisible({
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
