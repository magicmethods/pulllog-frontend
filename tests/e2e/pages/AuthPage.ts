import { expect, type Page } from "@playwright/test"
import {
    dismissCookieBanner,
    expectAppsPage,
    goldenUser,
    uiText,
    waitForLoaderToClear,
} from "../support/shared-ui"
import type { E2EScenarioContext } from "../support/test"

/**
 * Encapsulates authentication-related UI flows for E2E scenarios.
 */
export class AuthPage {
    constructor(private readonly context: E2EScenarioContext) {}

    /**
     * Logs in the seeded E2E user and lands on the apps page.
     */
    async loginAndOpenApps(): Promise<void> {
        const page = this.context.page

        await this.openAppsWithRecovery(page)
        await this.context.capturePageArrival("apps")
    }

    /**
     * Opens the apps screen and retries once when the browser is redirected
     * to the login/session-expired route while shared E2E state is settling.
     */
    private async openAppsWithRecovery(page: Page): Promise<void> {
        for (let attempt = 0; attempt < 3; attempt++) {
            await page.goto("/apps", { waitUntil: "domcontentloaded" })
            await dismissCookieBanner(page)
            await this.recoverFromAuthInterruption(page)
            await page
                .waitForLoadState("networkidle", { timeout: 15000 })
                .catch(() => {})
            await waitForLoaderToClear(page)

            if (/\/apps(?:\?.*)?$/.test(page.url())) {
                await expectAppsPage(page)
                return
            }
        }

        await expectAppsPage(page)
    }

    /**
     * Recovers from login or session-expired detours before the apps page is ready.
     */
    private async recoverFromAuthInterruption(page: Page): Promise<void> {
        await page
            .waitForURL(/\/(?:apps|auth\/login|error\/419)(?:\?.*)?$/, {
                timeout: 15000,
            })
            .catch(() => {})

        if (/\/error\/419(?:\?.*)?$/.test(page.url())) {
            await page.goto("/auth/login?redirect=%2Fapps", {
                waitUntil: "domcontentloaded",
            })
        }

        if (/\/auth\/login(?:\?.*)?$/.test(page.url())) {
            await waitForLoaderToClear(page)
            await this.context.capturePageArrival("auth-login")
            await this.submitLoginForm(page)
        }
    }

    /**
     * Completes the visible login form when the remember-token fallback is required.
     */
    private async submitLoginForm(page: Page): Promise<void> {
        await page.waitForLoadState("domcontentloaded").catch(() => {})

        if (/\/apps(?:\?.*)?$/.test(page.url())) {
            return
        }

        const emailInput = page.locator('input[autocomplete="username"]').last()
        const passwordInput = page
            .locator('input[autocomplete="current-password"]')
            .last()
        const rememberCheckbox = page.getByRole("checkbox", {
            name: uiText.rememberMe,
        })
        const submitButton = page
            .getByRole("button", { name: /^Login$|^ログイン$|^登录$/ })
            .first()

        const loginScreenState = await Promise.race([
            page
                .waitForURL(/\/apps(?:\?.*)?$/, { timeout: 10000 })
                .then(() => "apps"),
            emailInput
                .waitFor({ state: "visible", timeout: 10000 })
                .then(() => "form"),
        ]).catch(() => "timeout")

        if (
            loginScreenState === "apps" ||
            /\/apps(?:\?.*)?$/.test(page.url())
        ) {
            return
        }

        await expect(emailInput).toBeEditable({ timeout: 10000 })
        await emailInput.click()
        await emailInput.fill("")
        await emailInput.pressSequentially(goldenUser.email, { delay: 35 })
        await emailInput.blur()
        await expect(emailInput).toHaveValue(goldenUser.email)

        await expect(passwordInput).toBeEditable({ timeout: 10000 })
        await passwordInput.click()
        await passwordInput.fill("")
        await passwordInput.pressSequentially(goldenUser.password, {
            delay: 35,
        })
        await expect(passwordInput).toHaveValue(goldenUser.password)
        await passwordInput.blur()

        await page.waitForTimeout(250)

        if (!(await rememberCheckbox.isChecked().catch(() => false))) {
            await rememberCheckbox.check().catch(async () => {
                await rememberCheckbox.click()
            })
        }

        await expect(submitButton).toBeEnabled({ timeout: 10000 })
        await this.context.captureBeforeCommit("auth-login", "submit-login")

        await Promise.all([
            page
                .waitForURL(/\/(?:apps|error\/419)(?:\?.*)?$/, {
                    timeout: 15000,
                })
                .catch(() => {}),
            submitButton.click(),
        ])
    }
}
