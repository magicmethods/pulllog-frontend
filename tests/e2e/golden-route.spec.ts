import { AppsPage } from "./pages/AppsPage"
import { AuthPage } from "./pages/AuthPage"
import { HistoryPage } from "./pages/HistoryPage"
import { ShellPage } from "./pages/ShellPage"
import { StatsPage } from "./pages/StatsPage"
import { expect, test } from "./support/test"

test.setTimeout(300000)

test("golden route: login, open history, and save a log", async ({
    scenario,
}) => {
    const nonce = Date.now().toString().slice(-8)
    const appName = "Genshin Impact"
    const note = `Golden route note ${nonce}`

    const authPage = new AuthPage(scenario)
    const appsPage = new AppsPage(scenario)
    const historyPage = new HistoryPage(scenario)
    const statsPage = new StatsPage(scenario)
    const shellPage = new ShellPage(scenario)

    scenario.note(`Seeded app reused for the route: ${appName}`)

    await test.step("login and open apps page", async () => {
        await authPage.loginAndOpenApps()
        await appsPage.expectAppVisible(appName)
    })

    await test.step("move to history and save a log", async () => {
        await appsPage.openHistoryRegistration(appName)
        await historyPage.waitUntilReady(appName)
        await historyPage.saveLog({
            totalPullCount: "10",
            dischargedItems: "1",
            expense: "25",
            note,
        })
    })

    await test.step("open the stats page and render charts", async () => {
        await statsPage.openFromHeader()
        await statsPage.waitUntilReady(appName)
        await statsPage.showCharts(appName)
    })

    await test.step("open the drawer, switch preferences, and logout", async () => {
        await shellPage.openSettingsDrawer()
        await shellPage.switchLanguageAndThemeForSnapshot()
        await shellPage.restoreDefaultPreferences()
        await shellPage.logout()
    })

    await expect(scenario.page).toHaveURL(/\/auth\/login(?:\?.*)?$/)
    await expect(
        scenario.page.getByText(
            /Please enter your login information|ログイン情報を入力してください|请输入登录信息/,
        ),
    ).toBeVisible()
})
