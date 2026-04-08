import { expect } from "@playwright/test"
import {
    dismissCookieBanner,
    uiText,
    waitForLoaderToClear,
} from "../support/shared-ui"
import type { E2EScenarioContext } from "../support/test"

/**
 * Encapsulates navigation to the stats dashboard and chart aggregation.
 */
export class StatsPage {
    constructor(private readonly context: E2EScenarioContext) {}

    /**
     * Opens the stats screen from the shared header navigation.
     */
    async openFromHeader(): Promise<void> {
        const page = this.context.page

        await dismissCookieBanner(page)
        await waitForLoaderToClear(page)

        const statsLink = page.locator('#navi-links a[href="/stats"]').first()

        await expect(statsLink).toBeVisible({ timeout: 15000 })
        await statsLink.click()
    }

    /**
     * Waits until the stats page is fully ready for interaction.
     */
    async waitUntilReady(appName: string): Promise<void> {
        const page = this.context.page

        await expect(page).toHaveURL(/\/stats(?:\?.*)?$/)
        await dismissCookieBanner(page)
        await waitForLoaderToClear(page)
        await expect(
            page.getByRole("heading", { name: uiText.stats }).first(),
        ).toBeVisible({
            timeout: 15000,
        })
        await expect(page.locator("#stats-controller")).toBeVisible({
            timeout: 15000,
        })
        await expect(
            page.getByText(uiText.noAggregationResults).first(),
        ).toBeVisible({
            timeout: 15000,
        })

        this.context.note(`Stats page is ready for the seeded app: ${appName}`)
        await this.context.capturePageArrival("stats")
    }

    /**
     * Starts aggregation and waits for the chart tiles to render.
     */
    async showCharts(appName: string): Promise<void> {
        const page = this.context.page
        const startAggregationButton = page
            .getByRole("button", { name: uiText.startAggregation })
            .first()

        await expect(startAggregationButton).toBeVisible({ timeout: 15000 })

        if (!(await startAggregationButton.isEnabled().catch(() => false))) {
            await this.selectApp(appName)
        }

        await expect(startAggregationButton).toBeEnabled({ timeout: 15000 })
        await this.context.captureBeforeCommit("stats", "start-aggregation")

        await startAggregationButton.click()
        await waitForLoaderToClear(page)

        await expect(
            page.getByText(uiText.noAggregationResults).first(),
        ).toBeHidden({
            timeout: 30000,
        })

        const chartTiles = page.locator("#stats-content [data-tile-id]")
        const firstChartTile = chartTiles.first()
        await expect(firstChartTile).toBeVisible({ timeout: 30000 })
        await expect(firstChartTile).toContainText(/\S+/, { timeout: 15000 })

        const renderedTileCount = await chartTiles.count()
        expect(renderedTileCount).toBeGreaterThan(0)
        this.context.note(
            `Stats aggregation rendered ${renderedTileCount} chart tile(s) for: ${appName}`,
        )
        await this.context.captureCheckpoint("stats", "charts-visible")
    }

    /**
     * Fallback app selection when the stats page is opened without a preselected app.
     */
    private async selectApp(appName: string): Promise<void> {
        const page = this.context.page
        const appSelector = page
            .locator("#stats-controller .p-multiselect")
            .first()

        await expect(appSelector).toBeVisible({ timeout: 15000 })
        await appSelector.click()

        const escapedAppName = appName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const option = page
            .getByRole("option", { name: new RegExp(escapedAppName) })
            .first()

        await expect(option).toBeVisible({ timeout: 15000 })
        await option.click()
        await waitForLoaderToClear(page)
        await expect(appSelector).toContainText(appName)
        this.context.note(
            `The stats page opened without a selected app, so the seeded app was chosen explicitly: ${appName}`,
        )
    }
}
