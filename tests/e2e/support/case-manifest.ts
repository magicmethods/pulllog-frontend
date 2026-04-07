import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import type { TestInfo } from "@playwright/test"

export interface E2ECaseManifest {
    id: string
    enabled: boolean
    env: string
    baseURL?: string
    baseURLKey?: string
    account: {
        key: string
        role?: string
    }
    target: {
        pageId: string
        url?: string
        routeName?: string
        feature?: string
    }
    navigation?: {
        startFrom?: string
        skipProcess?: boolean
        prerequisiteState?: string
        stepsRef?: string
    }
    coverage: {
        includeLoginFlow?: boolean
        includeNavigationProcess?: boolean
        excludeLoginFlow?: boolean
        excludeNavigationProcess?: boolean
        excludeSetupFlow?: boolean
        notes?: string
    }
    preconditions?: string[]
    assertions?: string[]
    report: {
        markdown: boolean
        pdfOnSuccess: boolean
        screenshots?: string[]
        includeTraceOnFailure?: boolean
        includeVideoOnFailure?: boolean
        templates?: {
            markdown?: string
            evidence?: string
        }
    }
    execution?: {
        retries?: number
        timeoutMs?: number
        project?: string
        browser?: "chromium" | "firefox" | "webkit"
    }
    tags: string[]
    notes?: string
}

const casesRoot = path.resolve(process.cwd(), "e2e/cases")

let manifestCache: E2ECaseManifest[] | null = null

/**
 * Loads all JSON case manifests from the shared `e2e/cases` directory.
 */
export function loadCaseManifests(): E2ECaseManifest[] {
    if (manifestCache) {
        return manifestCache
    }

    manifestCache = readdirSync(casesRoot, { withFileTypes: true })
        .filter(
            (entry) =>
                entry.isFile() &&
                entry.name.endsWith(".json") &&
                entry.name !== "case.schema.json",
        )
        .map((entry) => {
            const manifestPath = path.join(casesRoot, entry.name)
            const content = readFileSync(manifestPath, "utf8")
            return validateCaseManifest(JSON.parse(content) as E2ECaseManifest)
        })
        .sort((left, right) => left.id.localeCompare(right.id))

    return manifestCache
}

/**
 * Resolves a single manifest by its case id.
 */
export function getCaseManifest(caseId: string): E2ECaseManifest {
    const manifest = loadCaseManifests().find((entry) => entry.id === caseId)

    if (!manifest) {
        throw new Error(
            `No E2E case manifest was found for case id "${caseId}" under ${casesRoot}.`,
        )
    }

    return manifest
}

/**
 * Determines whether the manifest should run for the active case and tag filters.
 */
export function shouldRunCase(manifest: E2ECaseManifest): boolean {
    if (!manifest.enabled) {
        return false
    }

    const requestedIds = parseTokens(
        process.env.PLAYWRIGHT_CASE_IDS ?? process.env.PLAYWRIGHT_CASE_ID,
    ).map((id) => id.toLowerCase())
    if (
        requestedIds.length > 0 &&
        !requestedIds.includes(manifest.id.toLowerCase())
    ) {
        return false
    }

    const requestedTags = parseTokens(
        process.env.PLAYWRIGHT_CASE_TAGS ?? process.env.PLAYWRIGHT_CASE_TAG,
    ).map((tag) => tag.toLowerCase())
    const normalizedManifestTags = manifest.tags.map((tag) => tag.toLowerCase())
    if (
        requestedTags.length > 0 &&
        !requestedTags.some((tag) => normalizedManifestTags.includes(tag))
    ) {
        return false
    }

    const requestedEnv = process.env.PLAYWRIGHT_CASE_ENV?.trim().toLowerCase()
    if (requestedEnv && manifest.env.trim().toLowerCase() !== requestedEnv) {
        return false
    }

    return true
}

/**
 * Adds manifest metadata to the Playwright test annotations.
 */
export function annotateCase(
    testInfo: TestInfo,
    manifest: E2ECaseManifest,
): void {
    testInfo.annotations.push({
        type: "case-id",
        description: manifest.id,
    })
    testInfo.annotations.push({
        type: "case-env",
        description: manifest.env,
    })
    testInfo.annotations.push({
        type: "case-target",
        description: manifest.target.pageId,
    })

    if (manifest.target.feature) {
        testInfo.annotations.push({
            type: "case-feature",
            description: manifest.target.feature,
        })
    }
}

/**
 * Expands manifest coverage flags into readable included and excluded coverage lists.
 */
export function describeCoverage(manifest: E2ECaseManifest): {
    included: string[]
    excluded: string[]
} {
    const included: string[] = []
    const excluded: string[] = []

    if (manifest.coverage.includeLoginFlow) {
        included.push("Login flow")
    }

    if (manifest.coverage.includeNavigationProcess) {
        included.push("Navigation process")
    }

    if (manifest.coverage.excludeLoginFlow) {
        excluded.push("Login flow")
    }

    if (manifest.coverage.excludeNavigationProcess) {
        excluded.push("Navigation process")
    }

    if (manifest.coverage.excludeSetupFlow) {
        excluded.push("Setup / data creation flow")
    }

    if (manifest.coverage.notes) {
        included.push(manifest.coverage.notes)
    }

    return {
        included,
        excluded,
    }
}

/**
 * Resolves the effective base URL for a case from the manifest or environment.
 */
export function resolveBaseURLForCase(
    manifest: E2ECaseManifest,
): string | undefined {
    if (manifest.baseURL) {
        return manifest.baseURL
    }

    if (!manifest.baseURLKey) {
        return process.env.PLAYWRIGHT_BASE_URL
    }

    const normalizedKey = normalizeEnvKey(manifest.baseURLKey)

    return (
        process.env[`PLAYWRIGHT_BASE_URL_${normalizedKey}`] ??
        process.env.PLAYWRIGHT_BASE_URL
    )
}

/**
 * Formats the deterministic date folder used by Markdown reports and evidence.
 */
export function formatReportDate(input: Date = new Date()): string {
    const year = input.getFullYear()
    const month = String(input.getMonth() + 1).padStart(2, "0")
    const day = String(input.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
}

function parseTokens(value: string | undefined): string[] {
    return (value ?? "")
        .split(/[\s,]+/)
        .map((token) => token.trim())
        .filter(Boolean)
}

function normalizeEnvKey(value: string): string {
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
}

function validateCaseManifest(manifest: E2ECaseManifest): E2ECaseManifest {
    if (!manifest.id) {
        throw new Error("E2E case manifest is missing `id`.")
    }

    if (!manifest.account?.key) {
        throw new Error(
            `E2E case manifest "${manifest.id}" is missing the required account key.`,
        )
    }

    if (!manifest.target?.pageId) {
        throw new Error(
            `E2E case manifest "${manifest.id}" is missing the required target.pageId value.`,
        )
    }

    if (!manifest.report) {
        throw new Error(
            `E2E case manifest "${manifest.id}" is missing the report block.`,
        )
    }

    if (!Array.isArray(manifest.tags) || manifest.tags.length === 0) {
        throw new Error(
            `E2E case manifest "${manifest.id}" must define at least one tag.`,
        )
    }

    return manifest
}
