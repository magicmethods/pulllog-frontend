import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import type { Page, TestInfo } from "@playwright/test"

export type SnapshotStage = "page-arrival" | "before-commit" | "checkpoint"

export interface SnapshotEntry {
    label: string
    pageName: string
    stage: SnapshotStage
    stageLabel: string
    action?: string
    url: string
    imagePath: string
    capturedAt: string
}

interface ScenarioManifest {
    title: string
    file: string
    project: string
    status: string
    expectedStatus: string
    durationMs: number
    notes: string[]
    errorMessages: string[]
    snapshots: SnapshotEntry[]
}

/**
 * Resolves the shared output directory used by all E2E artifacts.
 */
export function resolveResultsRoot(): string {
    return path.resolve(process.cwd(), "tests/test-results")
}

/**
 * Captures reusable screenshots and persists a scenario manifest for the final E2E report.
 */
export class E2EScenarioArtifacts {
    private readonly snapshots: SnapshotEntry[] = []
    private readonly notes: string[] = []
    private captureCount = 0

    constructor(
        private readonly page: Page,
        private readonly testInfo: TestInfo,
        private readonly resultsRoot = resolveResultsRoot(),
    ) {}

    /**
     * Stores a screenshot for a newly reached page.
     */
    async capturePageArrival(pageName: string): Promise<void> {
        await this.capture(pageName, "page-arrival")
    }

    /**
     * Stores a screenshot immediately before a state-changing UI action.
     */
    async captureBeforeCommit(pageName: string, action: string): Promise<void> {
        await this.capture(pageName, "before-commit", action)
    }

    /**
     * Stores a screenshot for an important post-action checkpoint.
     */
    async captureCheckpoint(pageName: string, action: string): Promise<void> {
        await this.capture(pageName, "checkpoint", action)
    }

    /**
     * Appends a short note that will also appear in the markdown report.
     */
    addNote(note: string): void {
        this.notes.push(note)
    }

    /**
     * Finalizes the per-scenario manifest after the test completes.
     */
    async finalize(): Promise<void> {
        const manifest: ScenarioManifest = {
            title: this.testInfo.title,
            file: this.testInfo.file,
            project: this.testInfo.project.name,
            status: this.testInfo.status ?? "unknown",
            expectedStatus: this.testInfo.expectedStatus,
            durationMs: this.testInfo.duration,
            notes: this.notes,
            errorMessages: this.testInfo.errors.map(
                (error) => error.message ?? "Unknown Playwright error",
            ),
            snapshots: this.snapshots,
        }

        const manifestDir = path.join(this.resultsRoot, "manifests")
        await mkdir(manifestDir, { recursive: true })

        await writeFile(
            path.join(manifestDir, `${this.baseSlug()}.json`),
            JSON.stringify(manifest, null, 2),
            "utf8",
        )
    }

    private async capture(
        pageName: string,
        stage: SnapshotStage,
        action?: string,
    ): Promise<void> {
        await this.page.waitForTimeout(250)
        await this.page.waitForLoadState("networkidle").catch(() => {})

        const label =
            stage === "page-arrival"
                ? `${pageName} page arrival`
                : stage === "before-commit"
                  ? `${pageName} before ${action ?? "commit"}`
                  : `${pageName} checkpoint ${action ?? "state"}`

        const screenshotDir = path.join(this.resultsRoot, "snapshots")
        await mkdir(screenshotDir, { recursive: true })

        this.captureCount += 1

        const filename = `${this.baseSlug()}-${String(this.captureCount).padStart(2, "0")}-${slugify(pageName)}-${stage}${action ? `-${slugify(action)}` : ""}.png`
        const absolutePath = path.join(screenshotDir, filename)
        const relativePath = `./snapshots/${filename}`

        const image = await this.page.screenshot({
            path: absolutePath,
            fullPage: true,
            animations: "disabled",
        })

        await this.testInfo.attach(label, {
            body: image,
            contentType: "image/png",
        })

        this.snapshots.push({
            label,
            pageName,
            stage,
            stageLabel:
                stage === "page-arrival"
                    ? "Page arrival"
                    : stage === "before-commit"
                      ? "Before commit"
                      : "Checkpoint",
            action,
            url: this.page.url(),
            imagePath: relativePath,
            capturedAt: new Date().toISOString(),
        })
    }

    private baseSlug(): string {
        return slugify(`${this.testInfo.project.name}-${this.testInfo.title}`)
    }
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}
