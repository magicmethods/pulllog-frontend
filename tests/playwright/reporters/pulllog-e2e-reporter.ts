import { createWriteStream, type WriteStream } from "node:fs"
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import type {
    FullConfig,
    FullResult,
    Reporter,
    Suite,
    TestCase,
    TestResult,
} from "@playwright/test/reporter"
import { formatReportDate } from "../../e2e/support/case-manifest"

interface SnapshotEntry {
    label: string
    pageName: string
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

interface ReporterOptions {
    outputDir?: string
}

type TemplateKind = "report" | "index" | "evidence"

/**
 * Writes a consolidated result log and case-specific Markdown E2E reports.
 */
class PulllogE2EReporter implements Reporter {
    private readonly outputDir: string
    private readonly reportsRoot: string
    private readonly templatesRoot: string
    private logStream?: WriteStream

    constructor(options: ReporterOptions = {}) {
        this.outputDir =
            options.outputDir ??
            path.resolve(process.cwd(), "tests/test-results")
        this.reportsRoot = path.resolve(process.cwd(), "e2e/reports")
        this.templatesRoot = path.resolve(process.cwd(), "e2e/templates")
    }

    async onBegin(_config: FullConfig, suite: Suite): Promise<void> {
        await mkdir(this.outputDir, { recursive: true })

        const staleTargets = [
            "artifacts",
            "html-report",
            "manifests",
            "snapshots",
            "e2e_report.md",
            "result.json",
            "result.log",
        ]

        await Promise.all(
            staleTargets.map((target) =>
                rm(path.join(this.outputDir, target), {
                    recursive: true,
                    force: true,
                }).catch(() => {}),
            ),
        )

        await mkdir(path.join(this.outputDir, "manifests"), {
            recursive: true,
        })
        await mkdir(path.join(this.outputDir, "snapshots"), {
            recursive: true,
        })

        this.logStream = createWriteStream(
            path.join(this.outputDir, "result.log"),
            {
                encoding: "utf8",
                flags: "w",
            },
        )

        this.writeLine("# PullLog E2E result log")
        this.writeLine(`Started: ${new Date().toISOString()}`)
        this.writeLine(`Discovered tests: ${suite.allTests().length}`)
        this.writeLine("")
    }

    onTestBegin(test: TestCase): void {
        this.writeLine(`[START] ${test.titlePath().join(" > ")}`)
    }

    onStdOut(chunk: string | Buffer): void {
        this.writeChunk(chunk)
    }

    onStdErr(chunk: string | Buffer): void {
        this.writeChunk(chunk)
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        this.writeLine(
            `[${result.status.toUpperCase()}] ${test.titlePath().join(" > ")} (${result.duration} ms)`,
        )

        for (const error of result.errors) {
            this.writeLine(`  ERROR: ${error.message}`)
        }
    }

    async onEnd(result: FullResult): Promise<void> {
        this.writeLine("")
        this.writeLine(`Finished: ${new Date().toISOString()}`)
        this.writeLine(`Overall status: ${result.status}`)

        await new Promise<void>((resolve) => {
            this.logStream?.end(() => resolve()) ?? resolve()
        })

        await this.generateMarkdownReport(result.status)
    }

    private async generateMarkdownReport(overallStatus: string): Promise<void> {
        const manifestsDir = path.join(this.outputDir, "manifests")
        const manifests = await this.loadManifests(manifestsDir)

        if (manifests.length === 0) {
            return
        }

        const reportDate = formatReportDate(new Date())

        await writeFile(
            path.join(this.outputDir, "e2e_report.md"),
            await this.buildSummaryReport(reportDate, overallStatus, manifests),
            "utf8",
        )

        await this.writeDailyReports(reportDate, overallStatus, manifests)
    }

    private async writeDailyReports(
        reportDate: string,
        overallStatus: string,
        manifests: ScenarioManifest[],
    ): Promise<void> {
        const dailyDir = path.join(this.reportsRoot, reportDate)
        await rm(dailyDir, { recursive: true, force: true }).catch(() => {})
        await mkdir(dailyDir, { recursive: true })

        await writeFile(
            path.join(dailyDir, "index.md"),
            await this.buildSummaryReport(
                reportDate,
                overallStatus,
                manifests,
                {
                    includeReportLinks: true,
                    linkPrefix: ".",
                },
            ),
            "utf8",
        )

        const manifestsByCase = groupManifestsByCaseId(manifests)

        for (const [caseId, caseManifests] of manifestsByCase.entries()) {
            if (!caseManifests.some((manifest) => manifest.report.markdown)) {
                continue
            }

            const caseDir = path.join(dailyDir, sanitizeSegment(caseId))
            await mkdir(caseDir, { recursive: true })
            await writeFile(
                path.join(caseDir, "report.md"),
                await this.buildCaseReport(caseManifests, caseDir),
                "utf8",
            )
        }
    }

    private async buildSummaryReport(
        reportDate: string,
        overallStatus: string,
        manifests: ScenarioManifest[],
        options: {
            includeReportLinks?: boolean
            linkPrefix?: string
        } = {},
    ): Promise<string> {
        const template = await this.loadTemplate(
            DEFAULT_TEMPLATE_FILES.index,
            DEFAULT_INDEX_TEMPLATE,
            resolveTemplateOverride("index"),
        )
        const summaryTable =
            manifests.length === 0
                ? "> No case manifests were generated for this run."
                : this.buildSummaryTable(
                      manifests,
                      options.includeReportLinks ?? false,
                      options.linkPrefix ?? ".",
                  )

        return applyTemplate(template, {
            EXECUTION_DATE: reportDate,
            GENERATED_AT: new Date().toISOString(),
            OVERALL_STATUS: overallStatus,
            DEFAULT_PROJECT_MATRIX: DEFAULT_PROJECT_MATRIX_MARKDOWN,
            SUMMARY_TABLE: summaryTable,
        })
    }

    private async buildCaseReport(
        projectManifests: ScenarioManifest[],
        reportDir: string,
    ): Promise<string> {
        const orderedManifests = sortManifestsForDisplay(projectManifests)
        const primaryManifest = orderedManifests[0]
        const template = await this.loadTemplate(
            DEFAULT_TEMPLATE_FILES.report,
            DEFAULT_CASE_REPORT_TEMPLATE,
            primaryManifest.report.templates?.markdown ??
                resolveTemplateOverride("report"),
        )

        const renderedReport = applyTemplate(template, {
            CASE_ID: primaryManifest.caseId,
            EXECUTION_TIMESTAMP: getLatestFinishedAt(orderedManifests),
            ENVIRONMENT: primaryManifest.environment,
            TARGET_FEATURE:
                primaryManifest.targetFeature ?? primaryManifest.targetPageId,
            TARGET_URL: primaryManifest.targetUrl ?? "(not specified)",
            BASE_URL:
                primaryManifest.baseURL ?? "(resolved by Playwright config)",
            PROJECT: orderedManifests
                .map((manifest) => formatProjectDisplayName(manifest.project))
                .join(", "),
            RESULT: summarizeProjectStatuses(orderedManifests),
            EXPECTED_STATUS: primaryManifest.expectedStatus,
            DURATION_MS: String(
                orderedManifests.reduce(
                    (total, manifest) => total + manifest.durationMs,
                    0,
                ),
            ),
            PROJECT_RESULT_SUMMARY:
                this.buildProjectResultSummary(orderedManifests),
            PRECONDITIONS: this.renderBulletList(
                primaryManifest.preconditions,
                "No prerequisites were recorded.",
            ),
            INCLUDED_COVERAGE: this.renderBulletList(
                primaryManifest.includedCoverage,
                "No included coverage notes were recorded.",
            ),
            EXCLUDED_COVERAGE: this.renderBulletList(
                primaryManifest.excludedCoverage,
                "No excluded coverage notes were recorded.",
            ),
            KEY_ASSERTIONS: this.renderBulletList(
                primaryManifest.keyAssertions,
                "No key assertions were recorded.",
            ),
            NOTES: this.renderBulletList(
                [
                    ...primaryManifest.notes,
                    ...buildProjectCoverageNotes(orderedManifests),
                ],
                "No additional notes were recorded.",
            ),
            ARTIFACT_REFERENCES: this.renderArtifactReferences(
                orderedManifests,
                reportDir,
            ),
            FAILURE_SUMMARY: this.buildFailureSummary(orderedManifests),
            PDF_NOTE:
                orderedManifests.every(
                    (manifest) => manifest.status === "passed",
                ) &&
                orderedManifests.some(
                    (manifest) => manifest.report.pdfOnSuccess,
                )
                    ? "> PDF archival is allowed for this case after review."
                    : "> PDF archival is not generated automatically in this step.",
        })

        const templateMetadata = buildTemplateMetadataComment(
            orderedManifests,
            reportDir,
        )
        return templateMetadata
            ? `${templateMetadata}\n${renderedReport}`
            : renderedReport
    }

    private renderBulletList(values: string[], fallback: string): string {
        if (values.length === 0) {
            return `- ${fallback}`
        }

        return values.map((value) => `- ${value}`).join("\n")
    }

    private renderArtifactReferences(
        manifests: ScenarioManifest[],
        reportDir: string,
    ): string {
        if (
            manifests.every(
                (manifest) =>
                    manifest.snapshots.length === 0 &&
                    manifest.artifacts.length === 0,
            )
        ) {
            return "- No artifacts were captured."
        }

        const lines: string[] = []

        for (const manifest of manifests) {
            lines.push(
                `### ${formatProjectDisplayName(manifest.project)} — ${manifest.status}`,
                "",
                `- Duration: \`${manifest.durationMs} ms\``,
            )

            if (manifest.snapshots.length === 0) {
                lines.push("- No snapshots were captured.", "")
            } else {
                for (const [index, snapshot] of manifest.snapshots.entries()) {
                    lines.push(
                        `#### Snapshot ${index + 1} — ${snapshot.pageName} (${snapshot.stageLabel})`,
                        "",
                        `- Label: ${snapshot.label}`,
                        `- URL: \`${snapshot.url}\``,
                    )

                    if (snapshot.action) {
                        lines.push(`- Action: \`${snapshot.action}\``)
                    }

                    lines.push(
                        `- Captured at: \`${snapshot.capturedAt}\``,
                        "",
                        `![${snapshot.label}](${this.toReportRelativePath(reportDir, snapshot.imagePath)})`,
                        "",
                    )
                }
            }

            const linkedArtifacts = manifest.artifacts.filter(
                (artifact) => !!artifact.path,
            )

            if (linkedArtifacts.length > 0) {
                lines.push("#### Additional artifacts", "")

                for (const artifact of linkedArtifacts) {
                    lines.push(
                        `- [${artifact.name}](${this.toReportRelativePath(reportDir, artifact.path ?? "")})${artifact.contentType ? ` — ${artifact.contentType}` : ""}`,
                    )
                }

                lines.push("")
            }
        }

        return lines.join("\n")
    }

    private buildProjectResultSummary(manifests: ScenarioManifest[]): string {
        const header = [
            "| Project | Status | Duration (ms) | Snapshots |",
            "| --- | --- | ---: | ---: |",
        ]
        const rows = manifests.map(
            (manifest) =>
                `| ${escapeCell(formatProjectDisplayName(manifest.project))} | ${manifest.status} | ${manifest.durationMs} | ${manifest.snapshots.length} |`,
        )

        return [...header, ...rows].join("\n")
    }

    private buildFailureSummary(manifests: ScenarioManifest[]): string {
        const sections = manifests.flatMap((manifest) => {
            if (manifest.errorMessages.length === 0) {
                return []
            }

            return [
                `### ${formatProjectDisplayName(manifest.project)}`,
                "",
                ...manifest.errorMessages.map(
                    (errorMessage) => `- ${errorMessage}`,
                ),
                "",
            ]
        })

        if (sections.length === 0) {
            return ""
        }

        return ["## Failure summary", "", ...sections].join("\n")
    }

    private buildSummaryTable(
        manifests: ScenarioManifest[],
        includeReportLinks: boolean,
        linkPrefix: string,
    ): string {
        const header = includeReportLinks
            ? [
                  "| Case ID | Result | Target | Project | Report |",
                  "| --- | --- | --- | --- | --- |",
              ]
            : [
                  "| Case ID | Environment | Target | Status | Duration (ms) | Snapshots |",
                  "| --- | --- | --- | --- | ---: | ---: |",
              ]

        const rows = manifests.map((manifest) => {
            if (includeReportLinks) {
                const reportLink = `${linkPrefix}/${sanitizeSegment(manifest.caseId)}/report.md`
                return `| ${escapeCell(manifest.caseId)} | ${manifest.status} | ${escapeCell(manifest.targetFeature ?? manifest.targetPageId)} | ${escapeCell(manifest.project)} | [report](${reportLink}) |`
            }

            return `| ${escapeCell(manifest.caseId)} | ${escapeCell(manifest.environment)} | ${escapeCell(manifest.targetFeature ?? manifest.targetPageId)} | ${manifest.status} | ${manifest.durationMs} | ${manifest.snapshots.length} |`
        })

        return [...header, ...rows].join("\n")
    }

    private async loadTemplate(
        fileName: string,
        fallback: string,
        overridePath?: string,
    ): Promise<string> {
        const candidates = resolveTemplateCandidates(
            this.templatesRoot,
            fileName,
            overridePath,
        )

        for (const candidate of candidates) {
            const template = await readFile(candidate, "utf8").catch(() => null)

            if (template) {
                return template
            }
        }

        return fallback
    }

    private toReportRelativePath(
        reportDir: string,
        candidatePath: string,
    ): string {
        const absolutePath = resolveArtifactPath(this.outputDir, candidatePath)
        return path.relative(reportDir, absolutePath).split(path.sep).join("/")
    }

    private async loadManifests(
        manifestsDir: string,
    ): Promise<ScenarioManifest[]> {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const manifestFiles = (await readdir(manifestsDir).catch(() => []))
                .filter((file) => file.endsWith(".json"))
                .sort((left, right) => left.localeCompare(right))

            if (manifestFiles.length > 0 || attempt === 9) {
                return Promise.all(
                    manifestFiles.map(async (file) => {
                        const content = await readFile(
                            path.join(manifestsDir, file),
                            "utf8",
                        )
                        return JSON.parse(content) as ScenarioManifest
                    }),
                )
            }

            await new Promise((resolve) => {
                setTimeout(resolve, 250)
            })
        }

        return []
    }

    private writeLine(line: string): void {
        this.logStream?.write(`${line}\n`)
    }

    private writeChunk(chunk: string | Buffer): void {
        const value = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk
        const lines = value.split(/\r?\n/)
        const filteredLines = lines.filter(
            (line) => !isIgnorableNoise(stripAnsi(line)),
        )

        if (filteredLines.every((line) => line.length === 0)) {
            return
        }

        const suffix = value.endsWith("\n") ? "\n" : ""
        this.logStream?.write(`${filteredLines.join("\n")}${suffix}`)
    }
}

const DEFAULT_PROJECT_MATRIX_MARKDOWN =
    "`chromium` (PC), `ipad-pro-11` (tablet), `iphone-14` (smartphone)"

const DEFAULT_TEMPLATE_FILES = {
    report: "report-template.md",
    index: "index-template.md",
    evidence: "evidence-template.html",
} as const

const DEFAULT_INDEX_TEMPLATE = `# PullLog E2E Daily Summary

- Execution date: {{EXECUTION_DATE}}
- Generated: {{GENERATED_AT}}
- Overall status: **{{OVERALL_STATUS}}**
- Default project matrix: {{DEFAULT_PROJECT_MATRIX}}

{{SUMMARY_TABLE}}
`

const DEFAULT_CASE_REPORT_TEMPLATE = `# PullLog E2E Report — {{CASE_ID}}

## Execution summary

- Execution timestamp: \`{{EXECUTION_TIMESTAMP}}\`
- Environment: \`{{ENVIRONMENT}}\`
- Case ID: \`{{CASE_ID}}\`
- Target page / feature: \`{{TARGET_FEATURE}}\`
- Target URL: \`{{TARGET_URL}}\`
- Base URL: \`{{BASE_URL}}\`
- Projects: \`{{PROJECT}}\`
- Result: **{{RESULT}}** (expected: \`{{EXPECTED_STATUS}}\`)
- Total duration: \`{{DURATION_MS}} ms\`

## Project result summary

{{PROJECT_RESULT_SUMMARY}}

## Prerequisites

{{PRECONDITIONS}}

## Included coverage

{{INCLUDED_COVERAGE}}

## Excluded coverage

{{EXCLUDED_COVERAGE}}

## Key assertions

{{KEY_ASSERTIONS}}

## Notes

{{NOTES}}

## Artifact references

{{ARTIFACT_REFERENCES}}

{{FAILURE_SUMMARY}}

{{PDF_NOTE}}
`

function applyTemplate(
    template: string,
    replacements: Record<string, string>,
): string {
    let rendered = template

    for (const [key, value] of Object.entries(replacements)) {
        rendered = rendered.replaceAll(`{{${key}}}`, value)
    }

    return rendered
}

function buildTemplateMetadataComment(
    manifests: ScenarioManifest[],
    reportDir: string,
): string {
    const orderedManifests = sortManifestsForDisplay(manifests)
    const primaryManifest = orderedManifests[0]
    const templateDir = process.env.PLAYWRIGHT_E2E_TEMPLATE_DIR?.trim()
    const reportTemplate =
        primaryManifest.report.templates?.markdown ??
        resolveTemplateOverride("report")
    const evidenceTemplate =
        primaryManifest.report.templates?.evidence ??
        resolveTemplateOverride("evidence")

    return `<!-- pulllog-e2e-meta ${JSON.stringify({
        caseId: primaryManifest.caseId,
        templateDir,
        templates: {
            markdown: reportTemplate,
            evidence: evidenceTemplate,
        },
        projectReports: orderedManifests.map((manifest) => ({
            project: manifest.project,
            status: manifest.status,
            snapshots: manifest.snapshots.map((snapshot) => ({
                label: snapshot.label,
                pageName: snapshot.pageName,
                stageLabel: snapshot.stageLabel,
                action: snapshot.action,
                capturedAt: snapshot.capturedAt,
                imagePath: toMetadataRelativePath(
                    reportDir,
                    snapshot.imagePath,
                ),
            })),
        })),
    })} -->`
}

function resolveTemplateOverride(kind: TemplateKind): string | undefined {
    const envKeys: Record<TemplateKind, string[]> = {
        report: [
            "PLAYWRIGHT_E2E_REPORT_TEMPLATE",
            "PLAYWRIGHT_E2E_REPORT_TEMPLATE_PATH",
        ],
        index: [
            "PLAYWRIGHT_E2E_INDEX_TEMPLATE",
            "PLAYWRIGHT_E2E_INDEX_TEMPLATE_PATH",
        ],
        evidence: [
            "PLAYWRIGHT_E2E_EVIDENCE_TEMPLATE",
            "PLAYWRIGHT_E2E_EVIDENCE_TEMPLATE_PATH",
        ],
    }

    for (const envKey of envKeys[kind]) {
        const value = process.env[envKey]?.trim()

        if (value) {
            return value
        }
    }

    return undefined
}

function resolveTemplateCandidates(
    templatesRoot: string,
    defaultFileName: string,
    overridePath?: string,
): string[] {
    const candidates = new Set<string>()
    const templateDir = process.env.PLAYWRIGHT_E2E_TEMPLATE_DIR?.trim()

    if (overridePath) {
        addTemplateCandidate(candidates, templatesRoot, overridePath)
    } else if (templateDir) {
        addTemplateCandidate(
            candidates,
            templatesRoot,
            path.posix.join(templateDir.replaceAll("\\", "/"), defaultFileName),
        )
    }

    addTemplateCandidate(candidates, templatesRoot, defaultFileName)
    return [...candidates]
}

function addTemplateCandidate(
    candidates: Set<string>,
    templatesRoot: string,
    candidatePath: string,
): void {
    const normalized = candidatePath.trim()

    if (!normalized) {
        return
    }

    if (path.isAbsolute(normalized)) {
        candidates.add(normalized)
        return
    }

    if (normalized.startsWith("./") || normalized.startsWith("../")) {
        candidates.add(path.resolve(process.cwd(), normalized))
        return
    }

    candidates.add(path.resolve(templatesRoot, normalized))
    candidates.add(path.resolve(process.cwd(), normalized))
}

function groupManifestsByCaseId(
    manifests: ScenarioManifest[],
): Map<string, ScenarioManifest[]> {
    const grouped = new Map<string, ScenarioManifest[]>()

    for (const manifest of manifests) {
        const existing = grouped.get(manifest.caseId)

        if (existing) {
            existing.push(manifest)
            continue
        }

        grouped.set(manifest.caseId, [manifest])
    }

    for (const [caseId, caseManifests] of grouped.entries()) {
        grouped.set(caseId, sortManifestsForDisplay(caseManifests))
    }

    return grouped
}

function sortManifestsForDisplay(
    manifests: ScenarioManifest[],
): ScenarioManifest[] {
    return [...manifests].sort((left, right) => {
        const orderDelta =
            getProjectDisplayOrder(left.project) -
            getProjectDisplayOrder(right.project)

        if (orderDelta !== 0) {
            return orderDelta
        }

        return left.project.localeCompare(right.project)
    })
}

function getProjectDisplayOrder(projectName: string): number {
    switch (projectName) {
        case "chromium":
            return 0
        case "ipad-pro-11":
            return 1
        case "iphone-14":
            return 2
        default:
            return 99
    }
}

function buildProjectCoverageNotes(manifests: ScenarioManifest[]): string[] {
    if (manifests.length <= 1) {
        return []
    }

    return [
        `Project comparison in PDF evidence is prepared for: ${manifests
            .map((manifest) => formatProjectDisplayName(manifest.project))
            .join(", ")}.`,
    ]
}

function summarizeProjectStatuses(manifests: ScenarioManifest[]): string {
    if (manifests.length === 0) {
        return "unknown"
    }

    if (manifests.length === 1) {
        return manifests[0]?.status ?? "unknown"
    }

    const passedCount = manifests.filter(
        (manifest) => manifest.status === "passed",
    ).length
    const failedCount = manifests.filter(
        (manifest) => manifest.status === "failed",
    ).length

    if (failedCount > 0) {
        return `failed (${passedCount}/${manifests.length} passed)`
    }

    if (passedCount === manifests.length) {
        return `passed (${passedCount}/${manifests.length} passed)`
    }

    return `mixed (${passedCount}/${manifests.length} passed)`
}

function getLatestFinishedAt(manifests: ScenarioManifest[]): string {
    return (
        [...manifests]
            .map((manifest) => manifest.finishedAt)
            .sort((left, right) => left.localeCompare(right))
            .at(-1) ?? new Date().toISOString()
    )
}

function formatProjectDisplayName(projectName: string): string {
    switch (projectName) {
        case "chromium":
            return "PC (chromium)"
        case "ipad-pro-11":
            return "Tablet (iPad)"
        case "iphone-14":
            return "SP (iPhone)"
        default:
            return projectName
    }
}

function toMetadataRelativePath(
    reportDir: string,
    candidatePath: string,
): string {
    const outputDir = path.resolve(process.cwd(), "tests/test-results")
    const absolutePath = resolveArtifactPath(outputDir, candidatePath)
    return path.relative(reportDir, absolutePath).split(path.sep).join("/")
}

function resolveArtifactPath(outputDir: string, candidatePath: string): string {
    if (path.isAbsolute(candidatePath)) {
        return candidatePath
    }

    if (candidatePath.startsWith(".")) {
        return path.resolve(outputDir, candidatePath.replace(/^\.\//, ""))
    }

    return path.resolve(process.cwd(), candidatePath)
}

function sanitizeSegment(value: string): string {
    return value.replace(/[^a-z0-9-_.]+/gi, "-")
}

function escapeCell(value: string): string {
    return value.replace(/\|/g, "\\|")
}

function stripAnsi(value: string): string {
    let result = ""

    for (let index = 0; index < value.length; index += 1) {
        if (value[index] === "\u001b" && value[index + 1] === "[") {
            index += 2

            while (index < value.length && value[index] !== "m") {
                index += 1
            }

            continue
        }

        result += value[index]
    }

    return result
}

function isIgnorableNoise(line: string): boolean {
    const normalized = line.trim()
    return (
        normalized.includes("ERROR  [unhandledRejection] read ECONNRESET") ||
        normalized.includes("at TLSWrap.onStreamRead")
    )
}

export default PulllogE2EReporter
