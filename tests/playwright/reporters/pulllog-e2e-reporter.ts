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

interface SnapshotEntry {
    label: string
    pageName: string
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

interface ReporterOptions {
    outputDir?: string
}

/**
 * Writes a consolidated result log and an image-rich markdown E2E report.
 */
class PulllogE2EReporter implements Reporter {
    private readonly outputDir: string
    private logStream?: WriteStream

    constructor(options: ReporterOptions = {}) {
        this.outputDir =
            options.outputDir ??
            path.resolve(process.cwd(), "tests/test-results")
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

        await mkdir(path.join(this.outputDir, "manifests"), { recursive: true })
        await mkdir(path.join(this.outputDir, "snapshots"), { recursive: true })

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

        const lines: string[] = [
            "# PullLog E2E Report",
            "",
            `- Generated: ${new Date().toISOString()}`,
            `- Overall status: **${overallStatus}**`,
            "",
        ]

        if (manifests.length === 0) {
            lines.push("> No scenario artifacts were collected.")
        } else {
            lines.push("## Summary", "")
            lines.push(
                "| Project | Scenario | Status | Duration (ms) | Snapshots |",
            )
            lines.push("| --- | --- | --- | ---: | ---: |")

            for (const manifest of manifests) {
                lines.push(
                    `| ${escapeCell(manifest.project)} | ${escapeCell(manifest.title)} | ${manifest.status} | ${manifest.durationMs} | ${manifest.snapshots.length} |`,
                )
            }

            lines.push("")

            for (const manifest of manifests) {
                lines.push(`## ${manifest.title} — ${manifest.project}`, "")
                lines.push(`- File: \`${manifest.file}\``)
                lines.push(
                    `- Status: **${manifest.status}** (expected: \`${manifest.expectedStatus}\`)`,
                )
                lines.push(`- Duration: \`${manifest.durationMs} ms\``)
                lines.push("")

                if (manifest.notes.length > 0) {
                    lines.push("### Notes", "")
                    for (const note of manifest.notes) {
                        lines.push(`- ${note}`)
                    }
                    lines.push("")
                }

                if (manifest.errorMessages.length > 0) {
                    lines.push("### Errors", "")
                    for (const errorMessage of manifest.errorMessages) {
                        lines.push(`- ${errorMessage}`)
                    }
                    lines.push("")
                }

                if (manifest.snapshots.length === 0) {
                    lines.push("> No snapshots captured.", "")
                    continue
                }

                lines.push("### Snapshots", "")

                for (const [index, snapshot] of manifest.snapshots.entries()) {
                    lines.push(
                        `#### ${index + 1}. ${snapshot.pageName} — ${snapshot.stageLabel}`,
                        "",
                    )
                    lines.push(`- Label: ${snapshot.label}`)
                    lines.push(`- URL: \`${snapshot.url}\``)
                    if (snapshot.action) {
                        lines.push(`- Action: \`${snapshot.action}\``)
                    }
                    lines.push(`- Captured at: \`${snapshot.capturedAt}\``)
                    lines.push("")
                    lines.push(
                        `![${snapshot.label}](${snapshot.imagePath})`,
                        "",
                    )
                }
            }
        }

        await writeFile(
            path.join(this.outputDir, "e2e_report.md"),
            lines.join("\n"),
            "utf8",
        )
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
