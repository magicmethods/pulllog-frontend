import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import type { Page, TestInfo } from "@playwright/test"
import {
    describeCoverage,
    type E2ECaseManifest,
    resolveBaseURLForCase,
} from "./case-manifest"

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

interface ArtifactEntry {
    name: string
    contentType?: string
    path?: string
}

interface ScenarioManifest {
    caseId: string
    title: string
    file: string
    project: string
    environment: string
    baseURL?: string
    targetPageId: string
    targetUrl?: string
    targetFeature?: string
    status: string
    expectedStatus: string
    durationMs: number
    startedAt: string
    finishedAt: string
    preconditions: string[]
    keyAssertions: string[]
    includedCoverage: string[]
    excludedCoverage: string[]
    notes: string[]
    errorMessages: string[]
    snapshots: SnapshotEntry[]
    artifacts: ArtifactEntry[]
    report: {
        markdown: boolean
        pdfOnSuccess: boolean
        includeTraceOnFailure: boolean
        includeVideoOnFailure: boolean
        templates?: {
            markdown?: string
            evidence?: string
        }
    }
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
    private readonly startedAt = new Date().toISOString()
    private caseManifest: E2ECaseManifest | null = null
    private captureCount = 0

    constructor(
        private readonly page: Page,
        private readonly testInfo: TestInfo,
        private readonly resultsRoot = resolveResultsRoot(),
    ) {}

    /**
     * Stores the active case manifest so report generation can stay manifest-driven.
     */
    setCaseManifest(manifest: E2ECaseManifest): void {
        this.caseManifest = manifest
    }

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
        const coverage = this.caseManifest
            ? describeCoverage(this.caseManifest)
            : { included: [], excluded: [] }
        const reportConfig = this.caseManifest?.report ?? {
            markdown: true,
            pdfOnSuccess: false,
            includeTraceOnFailure: true,
            includeVideoOnFailure: false,
        }
        const manifest: ScenarioManifest = {
            caseId: this.caseManifest?.id ?? this.baseSlug(),
            title: this.testInfo.title,
            file: this.testInfo.file,
            project: this.testInfo.project.name,
            environment:
                this.caseManifest?.env ??
                process.env.PLAYWRIGHT_CASE_ENV ??
                "local",
            baseURL: this.caseManifest
                ? (resolveBaseURLForCase(this.caseManifest) ??
                  this.resolveConfiguredBaseURL())
                : this.resolveConfiguredBaseURL(),
            targetPageId: this.caseManifest?.target.pageId ?? "unspecified",
            targetUrl: this.caseManifest?.target.url,
            targetFeature: this.caseManifest?.target.feature,
            status: this.testInfo.status ?? "unknown",
            expectedStatus: this.testInfo.expectedStatus,
            durationMs: this.testInfo.duration,
            startedAt: this.startedAt,
            finishedAt: new Date().toISOString(),
            preconditions: this.caseManifest?.preconditions ?? [],
            keyAssertions: this.caseManifest?.assertions ?? [],
            includedCoverage: coverage.included,
            excludedCoverage: coverage.excluded,
            notes: [
                ...(this.caseManifest?.notes ? [this.caseManifest.notes] : []),
                ...this.notes,
            ],
            errorMessages: this.testInfo.errors.map(
                (error) => error.message ?? "Unknown Playwright error",
            ),
            snapshots: this.snapshots,
            artifacts: this.collectArtifacts(),
            report: {
                markdown: reportConfig.markdown,
                pdfOnSuccess: reportConfig.pdfOnSuccess,
                includeTraceOnFailure:
                    reportConfig.includeTraceOnFailure ?? true,
                includeVideoOnFailure:
                    reportConfig.includeVideoOnFailure ?? false,
                templates: reportConfig.templates
                    ? {
                          markdown: reportConfig.templates.markdown,
                          evidence: reportConfig.templates.evidence,
                      }
                    : undefined,
            },
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
        if (this.page.isClosed()) {
            return
        }

        await this.page.waitForTimeout(250).catch(() => {})

        if (this.page.isClosed()) {
            return
        }

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

        const image = await this.page
            .screenshot({
                path: absolutePath,
                fullPage: true,
                animations: "disabled",
            })
            .catch(() => null)

        if (!image) {
            return
        }

        await this.testInfo
            .attach(label, {
                body: image,
                contentType: "image/png",
            })
            .catch(() => {})

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

    private collectArtifacts(): ArtifactEntry[] {
        return this.testInfo.attachments
            .map((attachment) => ({
                name: attachment.name,
                contentType: attachment.contentType,
                path: attachment.path
                    ? this.normalizePath(attachment.path)
                    : undefined,
            }))
            .filter(
                (attachment) =>
                    !!attachment.path || attachment.name !== "trace",
            )
    }

    private resolveConfiguredBaseURL(): string | undefined {
        const projectUse = this.testInfo.project.use as
            | {
                  baseURL?: string
              }
            | undefined

        return projectUse?.baseURL
    }

    private normalizePath(filePath: string): string {
        const relativeToResults = path.relative(this.resultsRoot, filePath)

        if (!relativeToResults.startsWith("..")) {
            return `./${relativeToResults.split(path.sep).join("/")}`
        }

        return path.relative(process.cwd(), filePath).split(path.sep).join("/")
    }

    private baseSlug(): string {
        const caseIdOrTitle = this.caseManifest?.id ?? this.testInfo.title
        return slugify(`${this.testInfo.project.name}-${caseIdOrTitle}`)
    }
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}
