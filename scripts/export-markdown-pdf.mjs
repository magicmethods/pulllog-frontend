import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "@playwright/test"
import { marked } from "marked"

const DEFAULT_TARGET = "tests/test-results"

async function main() {
    const rawTarget = process.argv[2]?.trim() || DEFAULT_TARGET
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
    const renderedHtml = marked.parse(markdown, {
        gfm: true,
        breaks: true,
    })
    const htmlBody = await inlineLocalImageSources(
        renderedHtml,
        markdownFilePath,
    )

    await page.setContent(buildHtmlDocument(title, baseHref, htmlBody), {
        waitUntil: "load",
    })
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

function buildHtmlDocument(title, baseHref, htmlBody) {
    return `<!doctype html>
<html lang="ja">
    <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <base href="${escapeHtml(baseHref)}" />
        <style>
            :root {
                color-scheme: light;
                font-family: "Segoe UI", "Noto Sans JP", "Hiragino Sans", sans-serif;
                font-size: 12px;
                line-height: 1.6;
                color: #1f2937;
            }

            * {
                box-sizing: border-box;
            }

            html {
                background: #fff;
            }

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

            .report-meta {
                margin-bottom: 1.5rem;
                padding: 0.75rem 1rem;
                border: 1px solid #d0d7de;
                border-radius: 8px;
                background: #f8fafc;
                font-size: 0.95rem;
            }

            h1,
            h2,
            h3,
            h4 {
                margin-top: 1.4em;
                margin-bottom: 0.6em;
                color: #0f172a;
                page-break-after: avoid;
            }

            p,
            ul,
            ol,
            table,
            blockquote,
            pre {
                margin: 0 0 1rem;
            }

            p,
            li,
            td,
            th,
            .report-meta div {
                overflow-wrap: anywhere;
                word-break: break-word;
            }

            ul,
            ol {
                padding-left: 1.35rem;
            }

            table {
                width: 100%;
                table-layout: fixed;
                border-collapse: collapse;
                font-size: 0.92rem;
            }

            th,
            td {
                padding: 0.5rem 0.65rem;
                border: 1px solid #cbd5e1;
                text-align: left;
                vertical-align: top;
            }

            th {
                background: #f1f5f9;
            }

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
                overflow-wrap: anywhere;
                word-break: break-word;
            }

            pre {
                overflow-x: auto;
                padding: 0.9rem 1rem;
                border-radius: 8px;
                background: #0f172a;
                color: #e2e8f0;
                white-space: pre-wrap;
                word-break: break-word;
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

            @page {
                size: A4;
            }
        </style>
    </head>
    <body>
        <main>
            <div class="report-meta">
                <div><strong>Source:</strong> ${escapeHtml(title)}.md</div>
                <div><strong>Generated:</strong> ${escapeHtml(new Date().toISOString())}</div>
            </div>
            ${htmlBody}
        </main>
    </body>
</html>`
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
