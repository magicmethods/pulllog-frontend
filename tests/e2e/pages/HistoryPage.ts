import { expect } from "@playwright/test"
import {
    dismissCookieBanner,
    expectHistoryPage,
    uiText,
    waitForLoaderToClear,
} from "../support/shared-ui"
import type { E2EScenarioContext } from "../support/test"

export interface HistoryLogInput {
    totalPullCount: string
    dischargedItems?: string
    expense: string
    note: string
}

/**
 * Encapsulates the history registration UI and save flow.
 */
export class HistoryPage {
    constructor(private readonly context: E2EScenarioContext) {}

    /**
     * Waits for the history page to finish loading and records the arrival snapshot.
     */
    async waitUntilReady(appName: string): Promise<void> {
        const page = this.context.page

        await expectHistoryPage(page)
        await waitForLoaderToClear(page)
        await expect(page.getByText(appName).first()).toBeVisible({
            timeout: 15000,
        })
        await this.context.capturePageArrival("history")
    }

    /**
     * Fills the daily log form and commits it through the confirmation modal.
     */
    async saveLog(input: HistoryLogInput): Promise<void> {
        const page = this.context.page

        await page.getByRole("button", { name: uiText.change }).click()
        await expect(page.getByText(uiText.currentTargetDate)).toBeVisible()

        await page.locator("#total-pull-count").fill(input.totalPullCount)

        const dischargedItems = page.locator("#discharged-items")
        if (await dischargedItems.isEnabled()) {
            await dischargedItems.fill(input.dischargedItems ?? "1")
        }

        await page.locator("#expense").fill(input.expense)
        await page.locator("#note").fill(input.note)
        await this.context.captureBeforeCommit(
            "history",
            "open-save-confirmation",
        )

        await dismissCookieBanner(page)
        await waitForLoaderToClear(page)

        const saveButton = page.getByRole("button", { name: uiText.saveLog })
        await expect(saveButton).toBeVisible({ timeout: 15000 })
        await expect(saveButton).toBeEnabled({ timeout: 15000 })
        await saveButton.scrollIntoViewIfNeeded()
        await saveButton.click()

        const confirmModal = page.locator(".p-dialog").filter({
            hasText: uiText.logConfirmation,
        })
        await expect(confirmModal).toBeVisible()
        await this.context.captureBeforeCommit(
            "history-confirmation",
            "confirm-save-log",
        )

        const saveResponsePromise = page.waitForResponse(
            (response) =>
                ["POST", "PUT"].includes(response.request().method()) &&
                response.url().includes("/api/logs/daily/"),
            { timeout: 30000 },
        )

        await confirmModal.getByRole("button", { name: /Save|保存/ }).click()

        const saveResponse = await saveResponsePromise
        const saveResponseText = await saveResponse.text()
        expect(
            saveResponse.ok(),
            `history save failed (${saveResponse.status()}): ${saveResponseText}`,
        ).toBeTruthy()

        const successToast = page.getByText(uiText.saveSuccess).first()
        await expect(successToast).toBeVisible({
            timeout: 15000,
        })
        await this.context.captureCheckpoint("history", "save-success-toast")

        await successToast
            .waitFor({ state: "hidden", timeout: 15000 })
            .catch(() => {})
        await waitForLoaderToClear(page)
        await this.context.captureCheckpoint("history", "post-save-stable")

        const activityField = page.locator("#note")
        const latestHistorySection = page.getByText(
            /Latest History List|最新の履歴一覧|最新历史列表/,
        )
        const savedNoteInHistory = page.getByText(input.note).first()

        await expect(latestHistorySection).toBeVisible({ timeout: 15000 })
        await expect(savedNoteInHistory).toBeVisible({ timeout: 15000 })

        const currentNoteValue = await activityField
            .inputValue()
            .catch(() => "")
        if (currentNoteValue && currentNoteValue !== input.note) {
            this.context.note(
                `The shared seeded date already contained a different activity value after save (${currentNoteValue}), but the newly saved note remained visible in the latest history list.`,
            )
        }
    }
}
