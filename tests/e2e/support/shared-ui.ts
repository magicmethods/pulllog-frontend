import { expect, type Page } from "@playwright/test"

/**
 * Shared UI text patterns used across manifest-driven E2E scenarios.
 */
export const uiText = {
    addNew: /Register New App|新規アプリを登録する|注册新应用/,
    registerHistory: /Register History|履歴を登録する|登记历史/,
    change: /Change|変更|更改/,
    currentTargetDate: /Current Target Date|現在の登録対象日|当前目标日期/,
    saveLog: /Save Log|履歴を保存|保存记录/,
    logConfirmation: /Log Confirmation|確認|确认/,
    saveSuccess: /History Save Successful|履歴保存完了|历史保存成功/,
    rememberMe: /Remember me|ログイン状態を保持|记住我/,
    stats: /Stats|Statistics|統計|统计/,
    startAggregation: /Aggregate|Start Aggregation|集計開始|集計|开始统计|统计/,
    noAggregationResults:
        /No aggregation results available|集計結果がありません|暂无统计结果/,
    logout: /Logout|ログアウト|退出登录/,
    loggedOutPrompt:
        /Please enter your login information|ログイン情報を入力してください|请输入登录信息/,
    save: /Save|保存/,
    delete: /Delete|削除|删除/,
} as const

/**
 * Dismisses the cookie banner when it is shown in the current browser profile.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
    const acceptAllButton = page.getByRole("button", { name: "Accept All" })

    await acceptAllButton
        .waitFor({ state: "visible", timeout: 3000 })
        .then(async () => {
            await acceptAllButton.click()
        })
        .catch(() => {})
}

/**
 * Waits until the shared loading overlay is no longer blocking the UI.
 */
export async function waitForLoaderToClear(page: Page): Promise<void> {
    const overlay = page.locator(".loader-overlay").first()
    const nuxtSplash = page.getByText("Nuxt", { exact: true }).first()

    await overlay
        .waitFor({ state: "hidden", timeout: 30000 })
        .catch(async () => {
            const overlayCount = await overlay.count().catch(() => 0)

            if (overlayCount === 0) {
                return
            }

            await overlay
                .waitFor({ state: "detached", timeout: 30000 })
                .catch(() => {})
        })

    await nuxtSplash
        .waitFor({ state: "hidden", timeout: 45000 })
        .catch(() => {})
}

/**
 * Verifies that the browser is already on the apps page.
 */
export async function expectAppsPage(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/apps(?:\?.*)?$/)
}

/**
 * Verifies that the browser is already on the history page.
 */
export async function expectHistoryPage(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/history(?:\?.*)?$/)
}
