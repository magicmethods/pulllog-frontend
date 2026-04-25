import { spawnSync } from "node:child_process"
import path from "node:path"
import { expect, type Response } from "@playwright/test"
import { resolveRuntimeLaneForCase } from "../support/case-manifest"
import {
    dismissCookieBanner,
    expectAppsPage,
    waitForLoaderToClear,
} from "../support/shared-ui"
import type { E2EScenarioContext } from "../support/test"

const galleryUiText = {
    openUpload: /Upload image|画像をアップロード|上传图片/,
    uploadTitle: /Upload image|画像をアップロード|上传图片/,
    uploadSubmit: /^Upload$|^アップロード$|^上传$/,
    uploadSuccess:
        /The image was added to your gallery\.|画像をギャラリーに追加しました。|图片已添加到画廊。?/,
    openDetails: /Open details|詳細を開く|打开详情/,
    detailTitle: /Asset details|画像詳細|图片详情/,
    save: /^Save$|^保存$/,
    delete: /^Delete$|^削除する$|^删除$/,
    confirmDelete: /Confirm delete|削除を確定|确认删除/,
    deleteConfirmation:
        /Press delete again to permanently remove this asset\.|削除を実行するには、もう一度削除ボタンを押してください。|再次按删除以永久移除此资源。?/,
    saveSuccess:
        /The asset details were updated\.|画像の情報を更新しました。|资源详情已更新。?/,
    deleteSuccess:
        /The asset was removed from your gallery\.|画像を削除しました。|资源已从画廊中移除。?/,
} as const

const disposableAssetMarker = "FE-G5-DISPOSABLE"
const uploadAssetMarker = "FE-G4-UPLOAD"

const galleryUploadFixtures = {
    duplicateSourceWebp: path.resolve(
        process.cwd(),
        "e2e/fixtures/duplicate-source.webp",
    ),
    validSmallWebp: path.resolve(
        process.cwd(),
        "e2e/fixtures/valid-small.webp",
    ),
    validSmallPng: path.resolve(process.cwd(), "e2e/fixtures/valid-small.png"),
    validNearLimitJpg: path.resolve(
        process.cwd(),
        "e2e/fixtures/valid-near-limit.jpg",
    ),
    invalidTooLargeJpg: path.resolve(
        process.cwd(),
        "e2e/fixtures/invalid-too-large.jpg",
    ),
    invalidFormatGif: path.resolve(
        process.cwd(),
        "e2e/fixtures/invalid-format.gif",
    ),
} as const

type GalleryUploadFixtureName = keyof typeof galleryUploadFixtures

/**
 * Encapsulates the minimum authenticated gallery runtime checks.
 */
export class GalleryPage {
    constructor(private readonly context: E2EScenarioContext) {}

    async ensureDisposableAssetForActiveAccount(): Promise<void> {
        const account = this.context.requireAccount()

        await this.ensureDisposableAsset({
            userEmail: account.email,
            marker: disposableAssetMarker,
        })
    }

    /**
     * Opens the gallery route and confirms that the backing list and usage APIs are healthy.
     */
    async openAndExpectRuntimeHealthy(): Promise<void> {
        const page = this.context.page

        await this.ensureGalleryRouteReady()
        await this.waitForGalleryRuntimeSignal(page)

        await dismissCookieBanner(page)
        await waitForLoaderToClear(page)
        await expect(page).toHaveURL(/\/gallery(?:\?.*)?$/)
        await this.expectGalleryShell(page)

        this.context.note(
            "Gallery runtime signal reached ready state via explicit DOM marker.",
        )

        await this.context.capturePageArrival("gallery")
        await this.context.captureCheckpoint("gallery", "runtime-healthy")
    }

    /**
     * Opens the first gallery asset, updates its metadata, and then deletes it.
     */
    async verifyDetailSaveDelete(): Promise<void> {
        const page = this.context.page
        let cleanupAssetId: string | null = null
        let cleanupRequired = false

        await dismissCookieBanner(page)
        await waitForLoaderToClear(page)

        const assetButtons = page.getByRole("button", {
            name: galleryUiText.openDetails,
        })
        const initialAssetCount = await assetButtons.count()
        const disposableCard = page
            .locator("article")
            .filter({
                has: page.getByRole("heading", {
                    name: new RegExp(disposableAssetMarker),
                }),
            })
            .first()
        const disposableAssetButton = disposableCard.getByRole("button", {
            name: galleryUiText.openDetails,
        })

        if (initialAssetCount === 0) {
            throw new Error(
                "gallery detail/save/delete case requires at least one disposable gallery asset for the active account, but the gallery list is empty.",
            )
        }

        if ((await disposableAssetButton.count()) === 0) {
            throw new Error(
                `gallery detail/save/delete case requires a marker-tagged disposable asset (${disposableAssetMarker}), but no matching gallery card was visible.`,
            )
        }

        try {
            const detailResponsePromise = this.waitForAssetDetailResponse()
            await this.context.captureBeforeCommit("gallery", "open-detail")
            await disposableAssetButton.click()

            const detailResponse = await detailResponsePromise
            await this.expectApiStatus(detailResponse, 200, "detail fetch")

            const assetId = this.extractAssetId(detailResponse.url())
            cleanupAssetId = assetId
            const dialog = page.getByRole("dialog")
            const titleInput = page.locator("#gallery-detail-title")
            const descriptionInput = page.locator("#gallery-detail-description")
            const nonce = Date.now().toString().slice(-8)
            const updatedTitle = `${disposableAssetMarker} ${nonce}`
            const updatedDescription = `Playwright gallery detail save ${nonce}`

            await expect(
                dialog.getByText(galleryUiText.detailTitle),
            ).toBeVisible({
                timeout: 10000,
            })
            await expect(titleInput).toBeVisible({ timeout: 10000 })
            await expect(descriptionInput).toBeVisible({ timeout: 10000 })
            await this.context.captureCheckpoint("gallery", "detail-opened")

            await titleInput.fill(updatedTitle)
            await descriptionInput.fill(updatedDescription)

            const updateResponsePromise = this.waitForAssetMutationResponse(
                "PATCH",
                assetId,
            )
            await this.context.captureBeforeCommit("gallery", "save-detail")
            await dialog
                .getByRole("button", { name: galleryUiText.save })
                .click()

            const updateResponse = await updateResponsePromise
            await this.expectApiStatus(updateResponse, 200, "save update")
            await expect(page.getByText(galleryUiText.saveSuccess)).toBeVisible(
                {
                    timeout: 10000,
                },
            )
            await expect(dialog).toBeHidden({ timeout: 10000 })

            const updatedCard = page
                .locator("article")
                .filter({
                    has: page.getByRole("heading", {
                        name: updatedTitle,
                        exact: true,
                    }),
                })
                .first()

            await expect(updatedCard).toBeVisible({ timeout: 10000 })
            await this.context.captureCheckpoint("gallery", "detail-saved")

            const reopenDetailResponsePromise =
                this.waitForAssetDetailResponse(assetId)
            await updatedCard
                .getByRole("button", { name: galleryUiText.openDetails })
                .click()

            const reopenedDetailResponse = await reopenDetailResponsePromise
            await this.expectApiStatus(
                reopenedDetailResponse,
                200,
                "detail refetch",
            )
            await expect(titleInput).toHaveValue(updatedTitle)
            await expect(descriptionInput).toHaveValue(updatedDescription)

            await dialog
                .getByRole("button", { name: galleryUiText.delete })
                .click()
            await expect(
                dialog.getByText(galleryUiText.deleteConfirmation),
            ).toBeVisible({ timeout: 10000 })

            const deleteResponsePromise = this.waitForAssetMutationResponse(
                "DELETE",
                assetId,
            )
            await this.context.captureBeforeCommit("gallery", "delete-detail")
            cleanupRequired = true
            await dialog
                .getByRole("button", { name: galleryUiText.confirmDelete })
                .click()

            const deleteResponse = await deleteResponsePromise
            await this.expectApiStatus(deleteResponse, 204, "delete")
            await expect(
                page.getByText(galleryUiText.deleteSuccess),
            ).toBeVisible({
                timeout: 10000,
            })
            await expect(dialog).toBeHidden({ timeout: 10000 })
            await expect(updatedCard).toHaveCount(0)

            const finalAssetCount = await page
                .getByRole("button", {
                    name: galleryUiText.openDetails,
                })
                .count()

            await expect(finalAssetCount).toBe(initialAssetCount - 1)

            this.context.note(
                `Gallery detail flow verified for asset ${assetId}: detail=200, update=200, delete=204.`,
            )

            await this.context.captureCheckpoint("gallery", "detail-deleted")
        } finally {
            if (cleanupRequired && cleanupAssetId) {
                await this.ensureDisposableAsset({
                    assetId: cleanupAssetId,
                    marker: disposableAssetMarker,
                })
            }
        }
    }

    /**
     * Uploads a real image through the ticket + direct-upload flow and removes it again.
     */
    async verifyDirectUpload(options?: {
        fixtureName?: GalleryUploadFixtureName
    }): Promise<void> {
        const page = this.context.page
        const initialAssetCount = await this.countVisibleAssets()
        const dialogTitleInput = page.locator("#gallery-upload-title")
        const dialogDescriptionInput = page.locator(
            "#gallery-upload-description",
        )
        const nonce = Date.now().toString().slice(-8)
        const uploadedTitle = `${uploadAssetMarker} ${nonce}`
        const uploadedDescription = `Playwright gallery upload ${nonce}`
        const fixtureName = options?.fixtureName ?? "duplicateSourceWebp"
        const uploadFixturePath = this.resolveUploadFixturePath(fixtureName)
        let cleanupAssetId: string | null = null

        await dismissCookieBanner(page)
        await waitForLoaderToClear(page)

        const openUploadButton = page.getByRole("button", {
            name: galleryUiText.openUpload,
        })

        await expect(openUploadButton).toBeVisible({ timeout: 10000 })
        await openUploadButton.click()

        const dialog = page.getByRole("dialog")
        await expect(dialog.getByText(galleryUiText.uploadTitle)).toBeVisible({
            timeout: 10000,
        })
        await this.context.captureCheckpoint("gallery", "upload-dialog-opened")

        const fileInput = dialog.locator('input[type="file"]').first()

        await fileInput.setInputFiles(uploadFixturePath)
        await expect(
            dialog.getByRole("button", { name: galleryUiText.uploadSubmit }),
        ).toBeEnabled({ timeout: 10000 })

        await dialogTitleInput.fill(uploadedTitle)
        await dialogDescriptionInput.fill(uploadedDescription)

        const uploadTicketResponsePromise = this.waitForApiResponse(
            "POST",
            /\/api\/gallery\/assets\/upload-ticket(?:\?.*)?$/,
        )

        await this.context.captureBeforeCommit("gallery", "upload-submit")
        await dialog
            .getByRole("button", { name: galleryUiText.uploadSubmit })
            .click()

        const uploadTicketResponse = await uploadTicketResponsePromise
        await this.expectApiStatus(uploadTicketResponse, 200, "upload ticket")

        this.context.note(
            `Gallery upload ticket response: ${await this.summarizeResponse(uploadTicketResponse)}`,
        )

        const directUploadResponse = await this.waitForOptionalApiResponse(
            "POST",
            /\/api\/v1\/gallery\/assets(?:\?.*)?$/,
            15000,
        )

        if (!directUploadResponse) {
            const submitError = await dialog
                .getByRole("alert")
                .textContent()
                .catch(() => null)

            throw new Error(
                `gallery direct upload request was not observed after a successful upload ticket; dialog error=${submitError ?? "<none>"}`,
            )
        }

        await this.expectApiStatusOneOf(
            directUploadResponse,
            [200, 201],
            "direct upload",
        )

        this.context.note(
            `Gallery direct upload response: ${await this.summarizeResponse(directUploadResponse)}`,
        )

        const [listRefreshResponse, usageRefreshResponse] = await Promise.all([
            this.waitForApiResponse("GET", /\/api\/gallery\/assets(?:\?.*)?$/),
            this.waitForApiResponse("GET", /\/api\/gallery\/usage(?:\?.*)?$/),
        ])

        await this.expectApiStatus(listRefreshResponse, 200, "list refresh")
        await this.expectApiStatus(usageRefreshResponse, 200, "usage refresh")

        const uploadedCard = page
            .locator("article")
            .filter({
                has: page.getByRole("heading", {
                    name: uploadedTitle,
                    exact: true,
                }),
            })
            .first()

        await expect(page.getByText(galleryUiText.uploadSuccess)).toBeVisible({
            timeout: 10000,
        })
        await expect(dialog).toBeHidden({ timeout: 10000 })
        await expect(uploadedCard).toBeVisible({ timeout: 10000 })

        const finalAssetCount = await this.countVisibleAssets()
        await expect(finalAssetCount).toBeGreaterThanOrEqual(
            initialAssetCount + 1,
        )

        this.context.note(
            `Gallery upload flow verified: ticket=${uploadTicketResponse.status()}, upload=${directUploadResponse.status()}, list=${listRefreshResponse.status()}, usage=${usageRefreshResponse.status()}.`,
        )

        await this.context.captureCheckpoint("gallery", "upload-succeeded")

        try {
            const detailResponsePromise = this.waitForAssetDetailResponse()
            await this.context.captureBeforeCommit(
                "gallery",
                "open-uploaded-detail",
            )
            await uploadedCard
                .getByRole("button", { name: galleryUiText.openDetails })
                .click()

            const detailResponse = await detailResponsePromise
            await this.expectApiStatus(
                detailResponse,
                200,
                "uploaded detail fetch",
            )
            cleanupAssetId = this.extractAssetId(detailResponse.url())

            const detailDialog = page.getByRole("dialog")
            await expect(
                detailDialog.getByText(galleryUiText.detailTitle),
            ).toBeVisible({ timeout: 10000 })
            await expect(page.locator("#gallery-detail-title")).toHaveValue(
                uploadedTitle,
            )
            await expect(
                page.locator("#gallery-detail-description"),
            ).toHaveValue(uploadedDescription)

            await detailDialog
                .getByRole("button", { name: galleryUiText.delete })
                .click()
            await expect(
                detailDialog.getByText(galleryUiText.deleteConfirmation),
            ).toBeVisible({ timeout: 10000 })

            const deleteResponsePromise = this.waitForAssetMutationResponse(
                "DELETE",
                cleanupAssetId,
            )
            await this.context.captureBeforeCommit("gallery", "delete-uploaded")
            await detailDialog
                .getByRole("button", { name: galleryUiText.confirmDelete })
                .click()

            const deleteResponse = await deleteResponsePromise
            await this.expectApiStatus(deleteResponse, 204, "uploaded delete")
            await expect(
                page.getByText(galleryUiText.deleteSuccess),
            ).toBeVisible({
                timeout: 10000,
            })
            await expect(detailDialog).toBeHidden({ timeout: 10000 })
            await expect(uploadedCard).toHaveCount(0)

            this.context.note(
                `Uploaded gallery asset cleanup completed for asset ${cleanupAssetId}: delete=${deleteResponse.status()}.`,
            )

            await this.context.captureCheckpoint("gallery", "upload-cleaned")
        } catch (error) {
            if (cleanupAssetId) {
                this.context.note(
                    `Uploaded asset ${cleanupAssetId} could not be fully cleaned by the UI flow.`,
                )
            }

            throw error
        }
    }

    async verifyUploadTicketRejected(options: {
        fixtureName: GalleryUploadFixtureName
        expectedStatus: number
        titlePrefix?: string
    }): Promise<void> {
        const page = this.context.page
        const dialogTitleInput = page.locator("#gallery-upload-title")
        const dialogDescriptionInput = page.locator(
            "#gallery-upload-description",
        )
        const nonce = Date.now().toString().slice(-8)
        const titlePrefix = options.titlePrefix ?? "FE-G4-UPLOAD-REJECT"
        const uploadTitle = `${titlePrefix} ${nonce}`
        const uploadDescription = `Playwright gallery upload reject ${nonce}`
        const uploadFixturePath = this.resolveUploadFixturePath(
            options.fixtureName,
        )

        await dismissCookieBanner(page)
        await waitForLoaderToClear(page)

        const openUploadButton = page.getByRole("button", {
            name: galleryUiText.openUpload,
        })

        await expect(openUploadButton).toBeVisible({ timeout: 10000 })
        await openUploadButton.click()

        const dialog = page.getByRole("dialog")
        await expect(dialog.getByText(galleryUiText.uploadTitle)).toBeVisible({
            timeout: 10000,
        })
        await this.context.captureCheckpoint("gallery", "upload-dialog-opened")

        const fileInput = dialog.locator('input[type="file"]').first()
        await fileInput.setInputFiles(uploadFixturePath)

        await expect(
            dialog.getByRole("button", { name: galleryUiText.uploadSubmit }),
        ).toBeEnabled({ timeout: 10000 })

        await dialogTitleInput.fill(uploadTitle)
        await dialogDescriptionInput.fill(uploadDescription)

        const uploadTicketResponsePromise = this.waitForApiResponse(
            "POST",
            /\/api\/gallery\/assets\/upload-ticket(?:\?.*)?$/,
        )

        await this.context.captureBeforeCommit("gallery", "upload-submit")
        await dialog
            .getByRole("button", { name: galleryUiText.uploadSubmit })
            .click()

        const uploadTicketResponse = await uploadTicketResponsePromise
        await this.expectApiStatus(
            uploadTicketResponse,
            options.expectedStatus,
            "upload ticket rejection",
        )

        this.context.note(
            `Gallery rejected upload ticket response: ${await this.summarizeResponse(uploadTicketResponse)}`,
        )

        await expect(dialog.getByRole("alert")).toBeVisible({ timeout: 10000 })
        await this.context.captureCheckpoint("gallery", "upload-rejected")
    }

    private async waitForGalleryResponse(
        urlPattern: RegExp,
    ): Promise<Response> {
        return this.context.page.waitForResponse(
            (response) =>
                response.request().method() === "GET" &&
                urlPattern.test(response.url()),
            { timeout: 30000 },
        )
    }

    private async waitForGalleryRuntimeSignal(
        page: E2EScenarioContext["page"],
    ): Promise<void> {
        const root = page.locator("#gallery-page-root")

        await root.waitFor({ state: "visible", timeout: 30000 })
        await expect(root).toHaveAttribute("data-e2e-gallery-state", "ready", {
            timeout: 45000,
        })
    }

    private async waitForAssetDetailResponse(
        assetId?: string,
    ): Promise<Response> {
        return this.waitForApiResponse(
            "GET",
            assetId
                ? new RegExp(`/api/gallery/assets/${assetId}(?:\\?.*)?$`)
                : /\/api\/gallery\/assets\/[^/?#]+(?:\?.*)?$/,
        )
    }

    private async waitForAssetMutationResponse(
        method: "PATCH" | "DELETE",
        assetId: string,
    ): Promise<Response> {
        return this.waitForApiResponse(
            method,
            new RegExp(`/api/gallery/assets/${assetId}(?:\\?.*)?$`),
        )
    }

    private async waitForApiResponse(
        method: string,
        urlPattern: RegExp,
    ): Promise<Response> {
        return this.context.page.waitForResponse(
            (response) =>
                response.request().method() === method &&
                urlPattern.test(
                    new URL(response.url()).pathname +
                        new URL(response.url()).search,
                ),
            { timeout: 30000 },
        )
    }

    private async waitForOptionalApiResponse(
        method: string,
        urlPattern: RegExp,
        timeout: number,
    ): Promise<Response | null> {
        return await this.context.page
            .waitForResponse(
                (response) =>
                    response.request().method() === method &&
                    urlPattern.test(
                        new URL(response.url()).pathname +
                            new URL(response.url()).search,
                    ),
                { timeout },
            )
            .catch(() => null)
    }

    private extractAssetId(url: string): string {
        const match = new URL(url).pathname.match(
            /\/api\/gallery\/assets\/([^/?#]+)/,
        )

        if (!match?.[1]) {
            throw new Error(
                `Could not resolve gallery asset id from URL: ${url}`,
            )
        }

        return match[1]
    }

    private async expectApiStatus(
        response: Response,
        expectedStatus: number,
        action: string,
    ): Promise<void> {
        const actualStatus = response.status()

        if (actualStatus === expectedStatus) {
            return
        }

        const responseBody = await response.text().catch(() => "<unavailable>")

        throw new Error(
            `gallery ${action} returned ${actualStatus} instead of ${expectedStatus}; response body: ${responseBody}`,
        )
    }

    private async expectApiStatusOneOf(
        response: Response,
        expectedStatuses: number[],
        action: string,
    ): Promise<void> {
        const actualStatus = response.status()

        if (expectedStatuses.includes(actualStatus)) {
            return
        }

        const responseBody = await response.text().catch(() => "<unavailable>")

        throw new Error(
            `gallery ${action} returned ${actualStatus} instead of one of ${expectedStatuses.join(", ")}; response body: ${responseBody}`,
        )
    }

    private async summarizeResponse(response: Response): Promise<string> {
        const responseBody = await response.text().catch(() => "<unavailable>")

        return `${response.request().method()} ${response.url()} -> ${response.status()} body=${responseBody}`
    }

    private resolveUploadFixturePath(
        fixtureName: GalleryUploadFixtureName,
    ): string {
        return galleryUploadFixtures[fixtureName]
    }

    private async countVisibleAssets(): Promise<number> {
        return await this.context.page
            .getByRole("button", {
                name: galleryUiText.openDetails,
            })
            .count()
    }

    private async ensureDisposableAsset(input: {
        userEmail?: string
        assetId?: string
        marker?: string
    }): Promise<void> {
        const runtimeLane = resolveRuntimeLaneForCase(
            this.context.requireCaseManifest(),
        )
        const commandArgs = ["artisan"]

        if (runtimeLane === "local-e2e") {
            commandArgs.push("--env=e2e")
        }

        commandArgs.push("gallery:ensure-disposable-asset")

        if (input.userEmail) {
            commandArgs.push(`--user-email=${input.userEmail}`)
        }

        if (input.assetId) {
            commandArgs.push(`--asset-id=${input.assetId}`)
        }

        if (input.marker) {
            commandArgs.push(`--marker=${input.marker}`)
        }

        const command = spawnSync("php", commandArgs, {
            cwd: path.resolve(process.cwd(), "../backend/stable"),
            encoding: "utf8",
        })

        if (command.status !== 0) {
            const details = [command.stdout, command.stderr]
                .map((value) => value?.trim())
                .filter(Boolean)
                .join("\n")

            throw new Error(
                `gallery disposable asset command failed: ${details || "unknown error"}`,
            )
        }

        const output = [command.stdout, command.stderr]
            .map((value) => value?.trim())
            .filter(Boolean)
            .join("\n")

        if (output) {
            this.context.note(`Disposable gallery asset check: ${output}`)
        }
    }

    private async expectGalleryShell(
        page: E2EScenarioContext["page"],
    ): Promise<void> {
        await expect(page.locator("#gallery-usage-heading")).toBeVisible({
            timeout: 15000,
        })
    }

    private async ensureGalleryRouteReady(): Promise<void> {
        const page = this.context.page
        const loginEmailInput = page
            .getByPlaceholder(
                /Enter your email|メールアドレスを入力|请输入登录邮箱|请输入邮箱/,
            )
            .first()
        const galleryNavLink = page.getByRole("link", {
            name: /Gallery|ギャラリー|画廊/,
        })

        for (let attempt = 0; attempt < 4; attempt += 1) {
            await dismissCookieBanner(page)
            await waitForLoaderToClear(page)

            if (/\/gallery(?:\?.*)?$/.test(page.url())) {
                if (await this.waitForGalleryShell(page, 15000)) {
                    return
                }

                continue
            }

            if (/\/error\/419(?:\?.*)?$/.test(page.url())) {
                await page.goto("/auth/login?redirect=%2Fgallery", {
                    waitUntil: "domcontentloaded",
                    timeout: 30000,
                })
                continue
            }

            if (/\/auth\/login(?:\?.*)?$/.test(page.url())) {
                const loginState = await Promise.race([
                    page
                        .waitForURL(/\/(?:gallery|apps)(?:\?.*)?$/, {
                            timeout: 15000,
                        })
                        .then(() => "redirected"),
                    loginEmailInput
                        .waitFor({ state: "visible", timeout: 15000 })
                        .then(() => "form"),
                ]).catch(() => "timeout")

                if (loginState === "redirected") {
                    continue
                }

                if (loginState === "form") {
                    throw new Error(
                        "gallery runtime case landed on the manual login form instead of reusing the authenticated session.",
                    )
                }
            }

            if (/\/apps(?:\?.*)?$/.test(page.url())) {
                await expectAppsPage(page)

                const clickedNavigation = await galleryNavLink
                    .first()
                    .click()
                    .then(() => true)
                    .catch(() => false)

                if (clickedNavigation) {
                    await page
                        .waitForURL(/\/gallery(?:\?.*)?$/, {
                            timeout: 15000,
                        })
                        .catch(() => {})
                    await waitForLoaderToClear(page)

                    if (await this.waitForGalleryShell(page, 15000)) {
                        return
                    }
                }

                continue
            }

            await page.goto("/apps", {
                waitUntil: "domcontentloaded",
                timeout: 30000,
            })
        }

        throw new Error(
            `gallery runtime case could not reach /gallery; last URL was ${page.url()}`,
        )
    }

    private async waitForGalleryShell(
        page: E2EScenarioContext["page"],
        timeout: number,
    ): Promise<boolean> {
        return await page
            .locator("#gallery-usage-heading")
            .waitFor({ state: "visible", timeout })
            .then(() => true)
            .catch(() => false)
    }
}
