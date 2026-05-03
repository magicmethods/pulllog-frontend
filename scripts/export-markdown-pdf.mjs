import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "@playwright/test"
import { marked } from "marked"

process.loadEnvFile?.(".env.e2e")

const DEFAULT_TARGET = "e2e/reports"
const DEFAULT_TEMPLATES_ROOT = path.resolve(process.cwd(), "e2e/templates")
const DEFAULT_EVIDENCE_TEMPLATE_FILE = "evidence-template.html"
const PROJECT_COMPARISON_COLUMNS = [
    {
        key: "chromium",
        label: "PC (chromium)",
    },
    {
        key: "ipad-pro-11",
        label: "Tablet (iPad)",
    },
    {
        key: "iphone-14",
        label: "SP (iPhone)",
    },
]

async function main() {
    const rawArgs = process.argv.slice(2).filter((arg) => arg !== "--")
    const rawTarget = rawArgs[0]?.trim() || DEFAULT_TARGET
    const targetPath = path.resolve(process.cwd(), rawTarget)
    const markdownFiles = await collectMarkdownFiles(targetPath)

    if (markdownFiles.length === 0) {
        writeInfo(
            `[pdf-export] No Markdown files found under ${path.relative(process.cwd(), targetPath) || "."}.`,
        )
        return
    }

    const browser = await chromium.launch({ headless: true })

    try {
        const page = await browser.newPage({
            viewport: {
                width: 1440,
                height: 2000,
            },
        })

        for (const markdownFile of markdownFiles) {
            await exportMarkdownFile(page, markdownFile)
        }

        writeInfo(
            `[pdf-export] Converted ${markdownFiles.length} Markdown file(s) to PDF.`,
        )
    } finally {
        await browser.close()
    }
}

async function collectMarkdownFiles(targetPath) {
    const targetStats = await stat(targetPath).catch(() => null)

    if (!targetStats) {
        throw new Error(`[pdf-export] Target path was not found: ${targetPath}`)
    }

    if (targetStats.isFile()) {
        if (path.extname(targetPath).toLowerCase() !== ".md") {
            throw new Error(
                `[pdf-export] Target file must be a Markdown file: ${targetPath}`,
            )
        }

        return [targetPath]
    }

    const markdownFiles = []
    await walkDirectory(targetPath, markdownFiles)
    return markdownFiles.sort((left, right) => left.localeCompare(right))
}

async function walkDirectory(directoryPath, markdownFiles) {
    const entries = await readdir(directoryPath, { withFileTypes: true })

    for (const entry of entries) {
        const entryPath = path.join(directoryPath, entry.name)

        if (entry.isDirectory()) {
            await walkDirectory(entryPath, markdownFiles)
            continue
        }

        if (
            entry.isFile() &&
            path.extname(entry.name).toLowerCase() === ".md"
        ) {
            markdownFiles.push(entryPath)
        }
    }
}

async function exportMarkdownFile(page, markdownFilePath) {
    const markdown = await readFile(markdownFilePath, "utf8")
    const title = path.basename(
        markdownFilePath,
        path.extname(markdownFilePath),
    )
    const baseHref = pathToFileURL(
        `${path.dirname(markdownFilePath)}${path.sep}`,
    ).href
    const outputPath = markdownFilePath.replace(/\.md$/i, ".pdf")
    const templateMetadata = extractTemplateMetadata(markdown)
    const renderedHtml = marked.parse(markdown, {
        gfm: true,
        breaks: true,
    })
    const htmlBody = await inlineLocalImageSources(
        renderedHtml,
        markdownFilePath,
    )

    await page.setContent(
        await buildHtmlDocument(
            title,
            baseHref,
            htmlBody,
            markdownFilePath,
            templateMetadata,
        ),
        {
            waitUntil: "load",
        },
    )
    await waitForImages(page)
    await page.emulateMedia({ media: "screen" })
    await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        scale: 0.95,
        margin: {
            top: "14mm",
            right: "14mm",
            bottom: "14mm",
            left: "14mm",
        },
    })

    writeInfo(
        `[pdf-export] ${path.relative(process.cwd(), markdownFilePath)} -> ${path.relative(process.cwd(), outputPath)}`,
    )
}

async function waitForImages(page) {
    await page
        .evaluate(async () => {
            const images = Array.from(document.images)

            await Promise.all(
                images.map(
                    (image) =>
                        new Promise((resolve) => {
                            if (image.complete) {
                                resolve(true)
                                return
                            }

                            image.addEventListener(
                                "load",
                                () => resolve(true),
                                {
                                    once: true,
                                },
                            )
                            image.addEventListener(
                                "error",
                                () => resolve(true),
                                {
                                    once: true,
                                },
                            )
                        }),
                ),
            )
        })
        .catch(() => {})
}

async function inlineLocalImageSources(htmlBody, markdownFilePath) {
    const markdownDirectory = path.dirname(markdownFilePath)
    const imageTagPattern = /<img\b([^>]*?)src=(["'])(.*?)\2([^>]*)>/gims
    const matches = Array.from(htmlBody.matchAll(imageTagPattern))

    if (matches.length === 0) {
        return htmlBody
    }

    const replacements = await Promise.all(
        matches.map(async (match) => {
            const source = match[3]
            const resolvedSource = await resolveImageSource(
                source,
                markdownDirectory,
            )

            return {
                original: match[0],
                replacement: `<img${match[1]}src=${match[2]}${resolvedSource}${match[2]}${match[4]}>`,
            }
        }),
    )

    let updatedHtml = htmlBody

    for (const { original, replacement } of replacements) {
        updatedHtml = updatedHtml.replace(original, replacement)
    }

    return updatedHtml
}

async function resolveImageSource(source, markdownDirectory) {
    if (/^(?:data:|https?:|file:)/i.test(source)) {
        return source
    }

    const decodedSource = decodeHtmlAttribute(source)
    const sourcePath = path.resolve(markdownDirectory, decodedSource)
    const sourceStats = await stat(sourcePath).catch(() => null)

    if (!sourceStats?.isFile()) {
        return source
    }

    const imageBuffer = await readFile(sourcePath)
    const mimeType = getMimeType(sourcePath)
    return `data:${mimeType};base64,${imageBuffer.toString("base64")}`
}

function decodeHtmlAttribute(value) {
    return value
        .replaceAll("&amp;", "&")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
}

function getMimeType(filePath) {
    switch (path.extname(filePath).toLowerCase()) {
        case ".png":
            return "image/png"
        case ".jpg":
        case ".jpeg":
            return "image/jpeg"
        case ".gif":
            return "image/gif"
        case ".webp":
            return "image/webp"
        case ".svg":
            return "image/svg+xml"
        default:
            return "application/octet-stream"
    }
}

const DEFAULT_EVIDENCE_TEMPLATE = `<!doctype html>
<html lang="ja">
    <head>
        <meta charset="utf-8" />
        <title>{{TITLE}}</title>
        <base href="{{BASE_HREF}}" />
        <style>
            :root {
                color-scheme: light;
                font-family: "Segoe UI", "Noto Sans JP", "Hiragino Sans", sans-serif;
                font-size: 12px;
                line-height: 1.6;
                color: #1f2937;
            }

            * { box-sizing: border-box; }
            html { background: #fff; }
            body {
                margin: 0;
                background: #fff;
                overflow-wrap: anywhere;
                word-break: break-word;
            }

            main {
                width: 100%;
                max-width: 100%;
                margin: 0 auto;
                padding-right: 1mm;
            }

            .page-header {
                margin-bottom: 1.25rem;
                padding: 0.9rem 1rem;
                border: 1px solid #d0d7de;
                border-radius: 8px;
                background: #f8fafc;
            }

            h1, h2, h3, h4 {
                margin-top: 1.4em;
                margin-bottom: 0.6em;
                color: #0f172a;
                page-break-after: avoid;
            }

            p, ul, ol, table, blockquote, pre { margin: 0 0 1rem; }
            ul, ol { padding-left: 1.35rem; }

            table {
                width: 100%;
                table-layout: fixed;
                border-collapse: collapse;
                font-size: 0.92rem;
            }

            th, td {
                padding: 0.5rem 0.65rem;
                border: 1px solid #cbd5e1;
                text-align: left;
                vertical-align: top;
            }

            th { background: #f1f5f9; }

            img {
                display: block;
                max-width: 100%;
                height: auto;
                margin: 0.75rem auto;
                border: 1px solid #d0d7de;
                border-radius: 8px;
                page-break-inside: avoid;
            }

            code {
                padding: 0.12rem 0.3rem;
                border-radius: 4px;
                background: #eff3f6;
                font-family: "Cascadia Code", Consolas, monospace;
                font-size: 0.88rem;
                white-space: pre-wrap;
            }

            pre {
                overflow-x: auto;
                padding: 0.9rem 1rem;
                border-radius: 8px;
                background: #0f172a;
                color: #e2e8f0;
                white-space: pre-wrap;
            }

            pre code {
                padding: 0;
                background: transparent;
                color: inherit;
            }

            blockquote {
                padding-left: 1rem;
                border-left: 4px solid #94a3b8;
                color: #475569;
            }

            hr {
                border: none;
                border-top: 1px solid #cbd5e1;
                margin: 1.5rem 0;
            }

            @page { size: A4; }
        </style>
    </head>
    <body>
        <main>
            <section class="page-header">
                <h1>{{TITLE}}</h1>
                <p>{{SUBTITLE}}</p>
                <p><strong>Source:</strong> {{SOURCE_NAME}}</p>
                <p><strong>Generated:</strong> {{GENERATED_AT}}</p>
            </section>
            {{REPORT_BODY}}
        </main>
    </body>
</html>`

async function buildHtmlDocument(
    title,
    baseHref,
    htmlBody,
    markdownFilePath,
    templateMetadata = {},
) {
    const template = await loadEvidenceTemplate(templateMetadata)
    const rawComparisonSection =
        buildSnapshotComparisonSection(templateMetadata)
    const comparisonSection = rawComparisonSection
        ? await inlineLocalImageSources(rawComparisonSection, markdownFilePath)
        : ""
    const reportBody = template.includes("{{SNAPSHOT_COMPARISON_SECTION}}")
        ? htmlBody
        : `${comparisonSection}${htmlBody}`

    return applyHtmlTemplate(template, {
        TITLE: escapeHtml(title),
        BASE_HREF: escapeHtml(baseHref),
        SUBTITLE:
            "PDF evidence generated from the manifest-driven E2E Markdown report.",
        SOURCE_NAME: escapeHtml(`${title}.md`),
        GENERATED_AT: escapeHtml(new Date().toISOString()),
        SNAPSHOT_COMPARISON_SECTION: comparisonSection,
        REPORT_BODY: reportBody,
    })
}

function buildSnapshotComparisonSection(templateMetadata = {}) {
    const projectReports = Array.isArray(templateMetadata?.projectReports)
        ? templateMetadata.projectReports
        : []

    if (projectReports.length === 0) {
        return ""
    }

    const rows = new Map()

    for (const projectReport of projectReports) {
        const columnKey = resolveComparisonColumnKey(projectReport.project)

        if (!columnKey) {
            continue
        }

        const snapshots = Array.isArray(projectReport.snapshots)
            ? projectReport.snapshots
            : []

        for (const snapshot of snapshots) {
            const rowLabel = snapshot?.label?.trim()

            if (!rowLabel) {
                continue
            }

            const existing = rows.get(rowLabel) ?? {
                label: rowLabel,
                cells: {},
            }

            existing.cells[columnKey] = snapshot.imagePath
            rows.set(rowLabel, existing)
        }
    }

    if (rows.size === 0) {
        return ""
    }

    const tableRows = [...rows.values()]
        .map((row) => {
            const cells = PROJECT_COMPARISON_COLUMNS.map((column) => {
                const imagePath = row.cells[column.key]

                if (!imagePath) {
                    return '<td class="empty-cell">—</td>'
                }

                return `<td><img src="${escapeHtml(imagePath)}" alt="${escapeHtml(`${row.label} - ${column.label}`)}" /></td>`
            }).join("")

            return `<tr><th scope="row">${escapeHtml(row.label)}</th>${cells}</tr>`
        })
        .join("")

    writeInfo(
        `[pdf-export] Snapshot comparison rows: ${rows.size} across ${projectReports.length} project result(s).`,
    )

    return `
<section class="comparison-section">
    <h2>プロジェクト比較スナップショット</h2>
    <p>同一チェックポイントのスナップショットを PC / Tablet / SP の固定列で横並び表示しています。</p>
    <table class="comparison-table">
        <thead>
            <tr>
                <th>Label</th>
                ${PROJECT_COMPARISON_COLUMNS.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
            </tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>
</section>`
}

function resolveComparisonColumnKey(projectName) {
    switch (projectName) {
        case "chromium":
            return "chromium"
        case "ipad-pro-11":
            return "ipad-pro-11"
        case "iphone-14":
            return "iphone-14"
        default:
            return null
    }
}

async function loadEvidenceTemplate(templateMetadata = {}) {
    const templateOverride =
        templateMetadata?.templates?.evidence ??
        process.env.PLAYWRIGHT_E2E_EVIDENCE_TEMPLATE?.trim() ??
        process.env.PLAYWRIGHT_E2E_EVIDENCE_TEMPLATE_PATH?.trim()
    const templateDir =
        templateMetadata?.templateDir ??
        process.env.PLAYWRIGHT_E2E_TEMPLATE_DIR?.trim()
    const candidates = resolveTemplateCandidates(
        DEFAULT_TEMPLATES_ROOT,
        DEFAULT_EVIDENCE_TEMPLATE_FILE,
        templateOverride,
        templateDir,
    )

    for (const candidate of candidates) {
        const template = await readFile(candidate, "utf8").catch(() => null)

        if (template) {
            return template
        }
    }

    return DEFAULT_EVIDENCE_TEMPLATE
}

function resolveTemplateCandidates(
    templatesRoot,
    defaultFileName,
    overridePath,
    templateDir,
) {
    const candidates = new Set()

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

function addTemplateCandidate(candidates, templatesRoot, candidatePath) {
    const normalized = candidatePath?.trim()

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

function extractTemplateMetadata(markdown) {
    const match = markdown.match(
        /<!--\s*pulllog-e2e-meta\s+({[\s\S]*?})\s*-->/i,
    )

    if (!match?.[1]) {
        return {}
    }

    try {
        return JSON.parse(match[1])
    } catch {
        return {}
    }
}

function applyHtmlTemplate(template, replacements) {
    let rendered = template

    for (const [key, value] of Object.entries(replacements)) {
        rendered = rendered.replaceAll(`{{${key}}}`, value)
    }

    return rendered
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
}

function writeInfo(message) {
    process.stdout.write(`${message}\n`)
}

function writeError(message) {
    process.stderr.write(`${message}\n`)
}

main().catch((error) => {
    if (
        error instanceof Error &&
        error.message.includes("Executable doesn't exist")
    ) {
        writeError(
            "[pdf-export] Chromium is not installed. Run `pnpm run test:e2e:install` first.",
        )
    }

    writeError(
        error instanceof Error ? (error.stack ?? error.message) : String(error),
    )
    process.exitCode = 1
})
