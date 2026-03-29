import { expect, test } from "@playwright/test"

/**
 * 最小スモークテスト: トップページが応答し、描画されることを確認する。
 */
test("top page responds and renders", async ({ page }) => {
    const response = await page.goto("/")

    expect(response?.ok()).toBeTruthy()
    await expect(page.locator("body")).toBeVisible()
})
