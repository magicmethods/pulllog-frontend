import { expect, type Locator, type Page } from "@playwright/test"
import {
    dismissCookieBanner,
    expectAppsPage,
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
        await waitForLoaderToClear(page)
        await page.getByText(uiText.addNew).first().waitFor({
            state: "visible",
            timeout: 45000,
        })
        await this.context.capturePageArrival("apps")
    }

    /**
     * Opens the apps screen and retries once when the browser is redirected
     * to the login/session-expired route while shared E2E state is settling.
     */
    private async openAppsWithRecovery(page: Page): Promise<void> {
        let lastError: unknown

        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                await page.goto("/apps", {
                    waitUntil: "domcontentloaded",
                    timeout: 30000,
                })
            } catch (error) {
                lastError = error
                await page.waitForTimeout(3000)
                continue
            }

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

            await page.waitForTimeout(1500)
        }

        if (lastError) {
            throw lastError
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

        const credentials = this.context.requireAccount()
        const emailInput = page
            .getByPlaceholder(
                /Enter your email|メールアドレスを入力|请输入登录邮箱|请输入邮箱/,
            )
            .first()
        const passwordInput = page
            .getByPlaceholder(
                /Enter your password|パスワードを入力|请输入登录密码|请输入密码/,
            )
            .first()
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

        await this.fillLoginField(emailInput, credentials.email)
        await this.fillLoginField(passwordInput, credentials.password)

        if (!(await rememberCheckbox.isChecked().catch(() => false))) {
            await rememberCheckbox.check().catch(async () => {
                await rememberCheckbox.click()
            })
        }

        if (!(await this.waitForSubmitEnabled(submitButton))) {
            await this.forceReactiveInput(emailInput, credentials.email)
            await this.forceReactiveInput(passwordInput, credentials.password)
            await page.keyboard.press("Tab").catch(() => {})
        }

        await expect(submitButton).toBeEnabled({ timeout: 15000 })
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

    /**
     * Fills a login field and confirms the visible value for reactive form inputs.
     */
    private async fillLoginField(input: Locator, value: string): Promise<void> {
        await expect(input).toBeEditable({ timeout: 10000 })
        await input.click()
        await input.fill(value)
        await expect(input).toHaveValue(value)
        await input.blur()
    }

    /**
     * Re-dispatches input/change events when the framework has not enabled submit yet.
     */
    private async forceReactiveInput(
        input: Locator,
        value: string,
    ): Promise<void> {
        await input.evaluate((element, nextValue) => {
            const target = element as HTMLInputElement
            target.focus()
            target.value = nextValue
            target.dispatchEvent(new Event("input", { bubbles: true }))
            target.dispatchEvent(new Event("change", { bubbles: true }))
            target.blur()
        }, value)
    }

    /**
     * Waits for the login submit button to become enabled without failing immediately.
     */
    private async waitForSubmitEnabled(
        submitButton: Locator,
    ): Promise<boolean> {
        try {
            await expect(submitButton).toBeEnabled({ timeout: 5000 })
            return true
        } catch {
            return false
        }
    }
}
