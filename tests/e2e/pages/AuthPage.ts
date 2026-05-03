import {
    expect,
    type Locator,
    type Page,
    type Response,
} from "@playwright/test"
import { resolveAccountCredentials } from "../support/account-resolver"
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

    private static readonly APPS_URL_PATTERN = /\/apps\/?(?:[?#].*)?$/

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
     * Opens the email signup form and verifies representative client-side guardrails.
     */
    async validateEmailSignupGuardrails(): Promise<void> {
        const page = this.context.page
        const validName = "Playwright Validation User"
        const invalidEmail = "invalid-email"
        const validEmail = "playwright.validation@example.invalid"
        const shortPassword = "short"
        const validPassword = "ValidPass123!"

        await this.openRegisterPage()

        const {
            nameInput,
            emailInput,
            passwordInput,
            agreementInput,
            agreementLabel,
            submitButton,
        } = this.getRegisterFormControls(page)

        await expect(submitButton).toBeDisabled()

        await this.fillLoginField(nameInput, validName)
        await this.fillLoginField(emailInput, invalidEmail)
        await this.fillLoginField(passwordInput, shortPassword)
        await this.context.captureCheckpoint("auth-register", "invalid-inputs")

        await expect(page.getByText(uiText.validationEmail)).toBeVisible()
        await expect(page.getByText(uiText.validationPassword)).toBeVisible()
        await expect(submitButton).toBeDisabled()

        await this.fillLoginField(emailInput, validEmail)
        await this.fillLoginField(passwordInput, validPassword)

        if (!(await this.waitForSubmitEnabled(submitButton))) {
            await this.forceReactiveInput(emailInput, validEmail)
            await this.forceReactiveInput(passwordInput, validPassword)
        }

        await expect(submitButton).toBeDisabled()

        await this.setAgreementState(agreementLabel, agreementInput, true)
        await expect(submitButton).toBeEnabled({ timeout: 15000 })
        await this.context.captureCheckpoint("auth-register", "submit-ready")

        await this.setAgreementState(agreementLabel, agreementInput, false)
        await expect(page.getByText(uiText.validationTerms)).toBeVisible()
        await expect(submitButton).toBeDisabled()
        await expect(page.getByText(uiText.registerSuccess)).not.toBeVisible()
    }

    /**
     * Submits the register form with a seeded existing email and expects rejection.
     */
    async submitDuplicateEmailSignupRequest(): Promise<string> {
        const page = this.context.page
        const duplicateEmail =
            process.env.PLAYWRIGHT_E2E_STANDARD_USER_EMAIL?.trim() ??
            process.env.E2E_ACCOUNT_STANDARD_USER_EMAIL?.trim() ??
            process.env.PLAYWRIGHT_E2E_EMAIL?.trim() ??
            resolveAccountCredentials("standard_user")?.email

        if (!duplicateEmail) {
            throw new Error(
                "No duplicate signup target email is configured for the seeded standard E2E user.",
            )
        }

        await this.openRegisterPage()

        const nonce = Date.now().toString().slice(-8)
        const {
            nameInput,
            emailInput,
            passwordInput,
            agreementInput,
            agreementLabel,
            submitButton,
        } = this.getRegisterFormControls(page)

        await this.fillLoginField(nameInput, `Playwright Duplicate ${nonce}`)
        await this.fillLoginField(emailInput, duplicateEmail)
        await this.fillLoginField(passwordInput, "DuplicatePass123!")
        await this.setAgreementState(agreementLabel, agreementInput, true)
        await expect(submitButton).toBeEnabled({ timeout: 15000 })
        await this.context.captureBeforeCommit(
            "auth-register",
            "submit-duplicate-email",
        )

        const responsePromise = this.waitForRegisterResponse(page)
        await submitButton.click()

        const response = await responsePromise
        const payload = (await response.json().catch(() => null)) as {
            state?: string
            message?: string
        } | null

        expect(response.status()).toBe(400)
        expect(payload?.state).toBe("error")

        await expect(page.getByText(uiText.registerError)).toBeVisible()
        await expect(page.getByText(uiText.registerSuccess)).not.toBeVisible()
        await this.context.captureCheckpoint(
            "auth-register",
            "duplicate-rejected",
        )

        return duplicateEmail
    }

    /**
     * Submits a new email signup request with a unique address and expects acceptance.
     */
    async submitEmailSignupRequest(): Promise<string> {
        const page = this.context.page
        const nonce = Date.now().toString().slice(-8)
        const uniqueEmail = `playwright-signup-${Date.now()}@pulllog.test`
        const {
            nameInput,
            emailInput,
            passwordInput,
            agreementInput,
            agreementLabel,
            submitButton,
        } = this.getRegisterFormControls(page)

        await this.openRegisterPage()
        await this.fillLoginField(nameInput, `Playwright Signup ${nonce}`)
        await this.fillLoginField(emailInput, uniqueEmail)
        await this.fillLoginField(passwordInput, "SignupPass123!")
        await this.setAgreementState(agreementLabel, agreementInput, true)
        await expect(submitButton).toBeEnabled({ timeout: 15000 })
        await this.context.captureBeforeCommit(
            "auth-register",
            "submit-signup-request",
        )

        const responsePromise = this.waitForRegisterResponse(page)
        await submitButton.click()

        const response = await responsePromise
        const payload = (await response.json().catch(() => null)) as {
            state?: string
            message?: string
        } | null

        expect(response.status()).toBe(201)
        expect(payload?.state).toBe("success")

        await expect(page.getByText(uiText.registerSuccess)).toBeVisible()
        await expect(page.getByText(uiText.registerConfirmation)).toBeVisible()
        await this.context.captureCheckpoint("auth-register", "accepted")

        return uniqueEmail
    }

    /**
     * Opens the register page for anonymous signup coverage.
     */
    async openRegisterPage(): Promise<void> {
        const page = this.context.page

        await page.goto("/auth/register", {
            waitUntil: "domcontentloaded",
            timeout: 30000,
        })

        await dismissCookieBanner(page)
        await waitForLoaderToClear(page)
        await expect(page).toHaveURL(/\/auth\/register(?:\?.*)?$/)

        const { submitButton } = this.getRegisterFormControls(page)
        await submitButton.waitFor({
            state: "visible",
            timeout: 15000,
        })
        await this.context.capturePageArrival("auth-register")
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

                if (page.isClosed()) {
                    break
                }

                await page.waitForTimeout(3000).catch(() => {})
                continue
            }

            await dismissCookieBanner(page)
            await this.recoverFromAuthInterruption(page)
            await page
                .waitForLoadState("networkidle", { timeout: 15000 })
                .catch(() => {})
            await waitForLoaderToClear(page)

            if (this.isAppsUrl(page.url())) {
                await expectAppsPage(page)
                return
            }

            if (page.isClosed()) {
                break
            }

            await page.waitForTimeout(1500).catch(() => {})
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
            .waitForURL(/\/(?:apps\/?|auth\/login|error\/419)(?:[?#].*)?$/, {
                timeout: 15000,
            })
            .catch(() => {})

        if (/\/error\/419(?:[?#].*)?$/.test(page.url())) {
            await page.goto("/auth/login?redirect=%2Fapps", {
                waitUntil: "domcontentloaded",
            })
        }

        if (/\/auth\/login(?:[?#].*)?$/.test(page.url())) {
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

        if (this.isAppsUrl(page.url())) {
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
                .waitForURL(AuthPage.APPS_URL_PATTERN, { timeout: 10000 })
                .then(() => "apps"),
            emailInput
                .waitFor({ state: "visible", timeout: 10000 })
                .then(() => "form"),
        ]).catch(() => "timeout")

        if (loginScreenState === "apps" || this.isAppsUrl(page.url())) {
            return
        }

        await this.fillLoginField(emailInput, credentials.email)
        if (await this.didAuthRecoveryReachApps(page)) {
            return
        }

        await this.fillLoginField(passwordInput, credentials.password)
        if (await this.didAuthRecoveryReachApps(page)) {
            return
        }

        if (!(await rememberCheckbox.isChecked().catch(() => false))) {
            await rememberCheckbox.check().catch(async () => {
                await rememberCheckbox.click()
            })
        }

        if (await this.didAuthRecoveryReachApps(page)) {
            return
        }

        if (!(await this.waitForSubmitEnabled(submitButton))) {
            await this.forceReactiveInput(emailInput, credentials.email)
            await this.forceReactiveInput(passwordInput, credentials.password)
            await page.keyboard.press("Tab").catch(() => {})
        }

        if (await this.didAuthRecoveryReachApps(page)) {
            return
        }

        await expect(submitButton).toBeEnabled({ timeout: 15000 })
        await this.context.captureBeforeCommit("auth-login", "submit-login")

        const loginResponsePromise = this.waitForLoginResponse(page).catch(
            () => null,
        )

        await Promise.all([
            page
                .waitForURL(/\/(?:apps\/?|error\/419)(?:[?#].*)?$/, {
                    timeout: 15000,
                })
                .catch(() => {}),
            submitButton.click(),
        ])

        const loginResponse = await loginResponsePromise
        if (loginResponse && loginResponse.status() >= 400) {
            const responseBody =
                await this.readResponseBodySnippet(loginResponse)

            throw new Error(
                `auth login failed with ${loginResponse.status()}; response body: ${responseBody}`,
            )
        }

        await page.waitForLoadState("domcontentloaded").catch(() => {})
        const currentUrl = page.url()

        if (this.isAppsUrl(currentUrl)) {
            return
        }

        if (/\/auth\/login(?:[?#].*)?$/.test(currentUrl)) {
            if (loginResponse && loginResponse.status() < 400) {
                await page
                    .goto("/apps", {
                        waitUntil: "domcontentloaded",
                        timeout: 30000,
                    })
                    .catch(() => {})
                await waitForLoaderToClear(page)

                if (this.isAppsUrl(page.url())) {
                    return
                }
            }

            const [loginStatusSummary, loginErrorMessage] = await Promise.all([
                this.formatLoginResponseSummary(loginResponse),
                this.readVisibleLoginError(page),
            ])

            throw new Error(
                `auth login did not reach /apps; current URL is ${currentUrl}; ${loginStatusSummary}; visible error: ${loginErrorMessage}`,
            )
        }

        const loginStatusSummary =
            await this.formatLoginResponseSummary(loginResponse)

        throw new Error(
            `auth login did not reach /apps; current URL is ${currentUrl}; ${loginStatusSummary}`,
        )
    }

    private async didAuthRecoveryReachApps(page: Page): Promise<boolean> {
        await page.waitForLoadState("domcontentloaded").catch(() => {})

        return !page.isClosed() && this.isAppsUrl(page.url())
    }

    private isAppsUrl(url: string): boolean {
        try {
            const parsed = new URL(url, "https://pulllog.invalid")
            return /^\/apps\/?$/.test(parsed.pathname)
        } catch {
            return AuthPage.APPS_URL_PATTERN.test(url)
        }
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
     * Returns the shared register-page form controls used across signup scenarios.
     */
    private getRegisterFormControls(page: Page): {
        nameInput: Locator
        emailInput: Locator
        passwordInput: Locator
        agreementInput: Locator
        agreementLabel: Locator
        submitButton: Locator
    } {
        return {
            nameInput: page
                .getByPlaceholder(
                    /Enter your name \(display name\)|名前（表示名）を入力|请输入昵称（显示名）/,
                )
                .first(),
            emailInput: page
                .getByPlaceholder(
                    /Enter your email|メールアドレスを入力|请输入邮箱/,
                )
                .first(),
            passwordInput: page
                .getByPlaceholder(
                    /Enter your password|パスワードを入力|请输入密码/,
                )
                .first(),
            agreementInput: page.locator("#agree").first(),
            agreementLabel: page.locator("label[for='agree']").first(),
            submitButton: page
                .getByRole("button", { name: uiText.register })
                .first(),
        }
    }

    /**
     * Waits for the signup form POST response so assertions can verify real backend behavior.
     */
    private async waitForRegisterResponse(page: Page) {
        return page.waitForResponse((response) => {
            return (
                response.request().method() === "POST" &&
                /\/auth\/register(?:\?.*)?$/.test(response.url())
            )
        })
    }

    private async waitForLoginResponse(page: Page): Promise<Response> {
        return page.waitForResponse((response) => {
            return (
                response.request().method() === "POST" &&
                /\/auth\/login(?:\?.*)?$/.test(response.url())
            )
        })
    }

    private async readResponseBodySnippet(response: Response): Promise<string> {
        const body = await response.text().catch(() => "<unavailable>")
        const compactBody = body.replace(/\s+/g, " ").trim()

        if (!compactBody) {
            return "<empty>"
        }

        return compactBody.length > 300
            ? `${compactBody.slice(0, 300)}...`
            : compactBody
    }

    private async formatLoginResponseSummary(
        loginResponse: Response | null,
    ): Promise<string> {
        if (!loginResponse) {
            return "login response: <not captured>"
        }

        const responseBody = await this.readResponseBodySnippet(loginResponse)
        return `login response: status ${loginResponse.status()}, body ${responseBody}`
    }

    private async readVisibleLoginError(page: Page): Promise<string> {
        const candidates = [
            page.getByRole("alert").first(),
            page.locator("form .p-message-error").first(),
            page.locator("form [class*='message'][class*='error']").first(),
        ]

        for (const locator of candidates) {
            await locator
                .waitFor({ state: "visible", timeout: 1000 })
                .catch(() => {})

            const text = await locator.textContent().catch(() => null)
            const normalizedText = text?.replace(/\s+/g, " ").trim()

            if (normalizedText) {
                return normalizedText
            }
        }

        return "<none>"
    }

    /**
     * Toggles the register-page agreement checkbox via its visible label.
     */
    private async setAgreementState(
        label: Locator,
        input: Locator,
        checked: boolean,
    ): Promise<void> {
        const isChecked = await input.isChecked().catch(() => false)

        if (isChecked !== checked) {
            await label.click({ position: { x: 5, y: 5 } })
        }

        if (checked) {
            await expect(input).toBeChecked()
            return
        }

        await expect(input).not.toBeChecked()
    }

    /**
     * Waits for a submit button to become enabled without failing immediately.
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
