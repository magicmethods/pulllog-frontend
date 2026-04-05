import { expect, type Locator, type Page } from "@playwright/test"
import {
    dismissCookieBanner,
    uiText,
    waitForLoaderToClear,
} from "../support/shared-ui"
import type { E2EScenarioContext } from "../support/test"

/**
 * Encapsulates shared shell interactions such as the settings drawer and logout.
 */
export class ShellPage {
    constructor(private readonly context: E2EScenarioContext) {}

    /**
     * Opens the user settings drawer from the shared header avatar.
     */
    async openSettingsDrawer(): Promise<void> {
        const page = this.context.page

        await dismissCookieBanner(page)
        await waitForLoaderToClear(page)

        const avatarButton = page.locator("header .p-avatar").first()
        await expect(avatarButton).toBeVisible({ timeout: 15000 })
        await avatarButton.click()

        await this.waitForDrawer(page)
        await this.context.capturePageArrival("settings-drawer")
    }

    /**
     * Switches language and theme so the changed drawer state is captured.
     */
    async switchLanguageAndThemeForSnapshot(): Promise<void> {
        const page = this.context.page

        await this.selectDrawerOption(
            page,
            "language-select",
            /日本語|Japanese|中文/,
        )
        await this.selectDrawerOption(
            page,
            "theme-select",
            /Dark|ダーク|深色|黑暗/,
        )

        await expect(page.locator("html")).toHaveClass(/app-dark/, {
            timeout: 15000,
        })
        await this.context.captureCheckpoint(
            "settings-drawer",
            "language-theme-switched",
        )
    }

    /**
     * Restores the default language and theme without taking an extra snapshot.
     */
    async restoreDefaultPreferences(): Promise<void> {
        const page = this.context.page

        await this.selectDrawerOption(
            page,
            "language-select",
            /English|英語|英语/,
        )
        await this.selectDrawerOption(
            page,
            "theme-select",
            /Light|ライト|浅色|明るい/,
        )

        await expect(page.locator("html")).not.toHaveClass(/app-dark/, {
            timeout: 15000,
        })
    }

    /**
     * Logs out through the drawer and records the post-logout screen.
     */
    async logout(): Promise<void> {
        const page = this.context.page
        const drawer = await this.waitForDrawer(page)
        const logoutButton = drawer
            .getByRole("button", { name: uiText.logout })
            .first()

        await expect(logoutButton).toBeEnabled({ timeout: 15000 })
        await this.context.captureBeforeCommit("settings-drawer", "logout")

        await Promise.all([
            page.waitForURL(/\/auth\/login(?:\?.*)?$/, { timeout: 30000 }),
            logoutButton.click(),
        ])

        await dismissCookieBanner(page)
        await waitForLoaderToClear(page)
        await expect(page.getByText(uiText.loggedOutPrompt)).toBeVisible({
            timeout: 15000,
        })
        await this.context.capturePageArrival("logged-out")
    }

    /**
     * Resolves the visible drawer instance after it has opened.
     */
    private async waitForDrawer(page: Page): Promise<Locator> {
        const drawer = page.locator(".p-drawer").last()

        await expect(drawer).toBeVisible({ timeout: 15000 })
        await expect(drawer.locator("#language-select")).toBeVisible({
            timeout: 15000,
        })

        return drawer
    }

    /**
     * Selects an option from a PrimeVue drawer select control.
     */
    private async selectDrawerOption(
        page: Page,
        selectId: string,
        optionPattern: RegExp,
    ): Promise<void> {
        const drawer = await this.waitForDrawer(page)
        const select = drawer.locator(`#${selectId}`).first()

        await expect(select).toBeVisible({ timeout: 10000 })
        await select.click()

        const listbox = page.locator('[role="listbox"]').last()
        await expect(listbox).toBeVisible({ timeout: 10000 })

        const option = listbox
            .getByRole("option", { name: optionPattern })
            .first()

        await expect(option).toBeVisible({ timeout: 10000 })
        await option.click()
        await waitForLoaderToClear(page)
        await page.waitForTimeout(300)
    }
}
