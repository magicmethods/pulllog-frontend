import { spawn, spawnSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

process.loadEnvFile?.(".env.e2e")

const rawArgs = process.argv.slice(2)
const passThroughArgs = []
const env = { ...process.env }

let pendingOption = null

for (const arg of rawArgs) {
    if (arg === "--") {
        continue
    }

    if (arg.startsWith("--case=")) {
        env.PLAYWRIGHT_CASE_ID = appendValue(
            env.PLAYWRIGHT_CASE_ID,
            arg.slice("--case=".length),
        )
        continue
    }

    if (arg.startsWith("--tag=")) {
        env.PLAYWRIGHT_CASE_TAGS = appendValue(
            env.PLAYWRIGHT_CASE_TAGS,
            arg.slice("--tag=".length),
        )
        continue
    }

    if (arg.startsWith("--project=") || arg.startsWith("--projects=")) {
        const [, value = ""] = arg.split(/=(.*)/s, 2)
        env.PLAYWRIGHT_PROJECTS = appendValue(env.PLAYWRIGHT_PROJECTS, value)
        continue
    }

    if (arg.startsWith("--lane=")) {
        env.PLAYWRIGHT_RUNTIME_LANE = normalizeRuntimeLane(
            arg.slice("--lane=".length),
        )
        continue
    }

    if (pendingOption === "case") {
        env.PLAYWRIGHT_CASE_ID = appendValue(env.PLAYWRIGHT_CASE_ID, arg)
        pendingOption = null
        continue
    }

    if (pendingOption === "tag") {
        env.PLAYWRIGHT_CASE_TAGS = appendValue(env.PLAYWRIGHT_CASE_TAGS, arg)
        pendingOption = null
        continue
    }

    if (pendingOption === "projects") {
        env.PLAYWRIGHT_PROJECTS = appendValue(env.PLAYWRIGHT_PROJECTS, arg)
        pendingOption = null
        continue
    }

    if (pendingOption === "lane") {
        env.PLAYWRIGHT_RUNTIME_LANE = normalizeRuntimeLane(arg)
        pendingOption = null
        continue
    }

    switch (arg) {
        case "--case":
            pendingOption = "case"
            break
        case "--tag":
            pendingOption = "tag"
            break
        case "--project":
        case "--projects":
            pendingOption = "projects"
            break
        case "--lane":
            pendingOption = "lane"
            break
        default:
            passThroughArgs.push(arg)
            break
    }
}

if (pendingOption) {
    throw new Error(`Missing value for ${pendingOption} filter.`)
}

const implicitProjects = resolveManifestProjectOverride(env)
if (!env.PLAYWRIGHT_PROJECTS && implicitProjects) {
    env.PLAYWRIGHT_PROJECTS = implicitProjects
    process.stderr.write(
        `[run-e2e] Applying manifest-driven project selection: ${implicitProjects}\n`,
    )
}

const runtimeSelection = resolveRuntimeSelection(env)
if (runtimeSelection.baseURL) {
    env.PLAYWRIGHT_BASE_URL = runtimeSelection.baseURL
    process.stderr.write(
        `[run-e2e] Applying manifest-driven base URL: ${runtimeSelection.baseURL}\n`,
    )
}

process.stderr.write(
    `[run-e2e] Resolved runtime lane: ${runtimeSelection.lane}\n`,
)

if (
    runtimeSelection.lane === "local-dev" &&
    env.PLAYWRIGHT_ALLOW_LOCAL_DEV_LANE !== "1"
) {
    throw new Error(
        "local-dev lane is disabled by default. Set PLAYWRIGHT_ALLOW_LOCAL_DEV_LANE=1 only for documented exception cases.",
    )
}

if (runtimeSelection.lane === "local-dev") {
    runLocalDevHealthCheck(env, runtimeSelection)
}

if (runtimeSelection.useExistingServers) {
    env.PLAYWRIGHT_DISABLE_BACKEND_WEBSERVER = "1"
    env.PLAYWRIGHT_DISABLE_FRONTEND_WEBSERVER = "1"
    process.stderr.write(
        "[run-e2e] Using existing frontend/backend servers for this case.\n",
    )
}

const playwrightArgs = [
    "exec",
    "playwright",
    "test",
    "-c",
    "tests/playwright/playwright.config.ts",
    ...passThroughArgs,
]
const child =
    process.platform === "win32"
        ? spawn(
              process.env.ComSpec ?? "cmd.exe",
              [
                  "/d",
                  "/s",
                  "/c",
                  `pnpm ${playwrightArgs.map(quoteForCmd).join(" ")}`,
              ],
              {
                  cwd: process.cwd(),
                  env,
                  stdio: "inherit",
              },
          )
        : spawn("pnpm", playwrightArgs, {
              cwd: process.cwd(),
              env,
              stdio: "inherit",
          })

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal)
        return
    }

    process.exit(code ?? 1)
})

function appendValue(existingValue, nextValue) {
    if (!existingValue) {
        return nextValue
    }

    return `${existingValue},${nextValue}`
}

function resolveManifestProjectOverride(runtimeEnv) {
    const selectedManifests = resolveSelectedManifests(runtimeEnv)

    if (selectedManifests.length === 0) {
        return undefined
    }

    const resolvedProjects = new Set()

    for (const manifest of selectedManifests) {
        const manifestProjects = getManifestProjectOverride(manifest)

        if (manifestProjects.length === 0) {
            for (const defaultProject of [
                "chromium",
                "ipad-pro-11",
                "iphone-14",
            ]) {
                resolvedProjects.add(defaultProject)
            }
            continue
        }

        for (const manifestProject of manifestProjects) {
            resolvedProjects.add(manifestProject)
        }
    }

    return resolvedProjects.size > 0
        ? [...resolvedProjects].join(",")
        : undefined
}

function resolveRuntimeSelection(runtimeEnv) {
    const selectedManifests = resolveSelectedManifests(runtimeEnv)
    const requestedLane = runtimeEnv.PLAYWRIGHT_RUNTIME_LANE
        ? normalizeRuntimeLane(runtimeEnv.PLAYWRIGHT_RUNTIME_LANE)
        : undefined

    if (selectedManifests.length === 0) {
        return {
            lane: requestedLane ?? "local-e2e",
            baseURL: resolveLaneBaseURL(
                requestedLane ?? "local-e2e",
                runtimeEnv,
            ),
            useExistingServers: (requestedLane ?? "local-e2e") === "local-dev",
        }
    }

    const manifestsByLane = new Map()
    const resolvedBaseURLs = new Set()

    for (const manifest of selectedManifests) {
        const runtimeLane = resolveManifestRuntimeLane(manifest)
        const manifestsForLane = manifestsByLane.get(runtimeLane) ?? []

        manifestsForLane.push(manifest.id)
        manifestsByLane.set(runtimeLane, manifestsForLane)

        const baseURL = resolveManifestBaseURL(manifest, runtimeEnv)

        if (!baseURL) {
            throw new Error(
                `Unable to resolve base URL for manifest "${manifest.id}" on lane "${runtimeLane}".`,
            )
        }

        resolvedBaseURLs.add(baseURL)
    }

    if (manifestsByLane.size > 1) {
        const laneSummary = [...manifestsByLane.entries()]
            .map(([lane, caseIds]) => `${lane}: ${caseIds.join(", ")}`)
            .join(" | ")

        throw new Error(
            `Selected manifests span multiple runtime lanes and cannot run together. ${laneSummary}`,
        )
    }

    const [resolvedLane] = manifestsByLane.keys()

    if (requestedLane && requestedLane !== resolvedLane) {
        throw new Error(
            `Requested runtime lane "${requestedLane}" does not match the selected manifest lane "${resolvedLane}".`,
        )
    }

    if (resolvedBaseURLs.size !== 1) {
        throw new Error(
            `Selected manifests resolve to multiple base URLs on lane "${resolvedLane}": ${[...resolvedBaseURLs].join(", ")}`,
        )
    }

    const [baseURL] = [...resolvedBaseURLs]

    return {
        lane: resolvedLane,
        baseURL,
        useExistingServers: resolvedLane === "local-dev",
    }
}

function resolveSelectedManifests(runtimeEnv) {
    const caseIds = parseTokens(
        runtimeEnv.PLAYWRIGHT_CASE_IDS ?? runtimeEnv.PLAYWRIGHT_CASE_ID,
    ).map((value) => value.toLowerCase())
    const caseTags = parseTokens(
        runtimeEnv.PLAYWRIGHT_CASE_TAGS ?? runtimeEnv.PLAYWRIGHT_CASE_TAG,
    ).map((value) => value.toLowerCase())
    const requestedEnv = runtimeEnv.PLAYWRIGHT_CASE_ENV?.trim().toLowerCase()
    const manifests = loadCaseManifests()

    return manifests.filter((manifest) => {
        if (!manifest?.enabled) {
            return false
        }

        if (
            caseIds.length > 0 &&
            !caseIds.includes(manifest.id?.trim().toLowerCase())
        ) {
            return false
        }

        if (
            requestedEnv &&
            manifest.env?.trim().toLowerCase() !== requestedEnv
        ) {
            return false
        }

        if (caseTags.length === 0) {
            return true
        }

        const manifestTags = Array.isArray(manifest.tags)
            ? manifest.tags.map((value) => value.toLowerCase())
            : []

        return caseTags.some((tag) => manifestTags.includes(tag))
    })
}

function resolveManifestBaseURL(manifest, runtimeEnv) {
    const runtimeLane = resolveManifestRuntimeLane(manifest)

    if (
        runtimeLane === "local-dev" &&
        runtimeEnv.PLAYWRIGHT_LOCAL_DEV_FRONTEND_URL
    ) {
        return runtimeEnv.PLAYWRIGHT_LOCAL_DEV_FRONTEND_URL
    }

    if (typeof manifest?.baseURL === "string" && manifest.baseURL.length > 0) {
        return manifest.baseURL
    }

    if (
        typeof manifest?.baseURLKey !== "string" ||
        manifest.baseURLKey.length === 0
    ) {
        return runtimeEnv.PLAYWRIGHT_BASE_URL
    }

    const normalizedKey = manifest.baseURLKey
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")

    return (
        runtimeEnv[`PLAYWRIGHT_BASE_URL_${normalizedKey}`] ??
        runtimeEnv.PLAYWRIGHT_BASE_URL
    )
}

function resolveManifestRuntimeLane(manifest) {
    const explicitLane = manifest?.execution?.runtimeLane

    if (explicitLane) {
        return normalizeRuntimeLane(explicitLane)
    }

    if (typeof manifest?.baseURL === "string" && manifest.baseURL.length > 0) {
        return "local-dev"
    }

    if (
        typeof manifest?.baseURLKey === "string" &&
        manifest.baseURLKey.length > 0
    ) {
        return "local-e2e"
    }

    return "local-e2e"
}

function resolveLaneBaseURL(lane, runtimeEnv) {
    if (lane === "local-dev") {
        return runtimeEnv.PLAYWRIGHT_LOCAL_DEV_FRONTEND_URL
    }

    return (
        runtimeEnv.PLAYWRIGHT_BASE_URL_LOCAL_E2E ??
        runtimeEnv.PLAYWRIGHT_BASE_URL
    )
}

function runLocalDevHealthCheck(runtimeEnv, runtimeSelection) {
    const scriptPath = path.resolve(
        process.cwd(),
        "scripts/check-e2e-health.mjs",
    )
    const healthArgs = [scriptPath, "--lane", runtimeSelection.lane]

    env.PLAYWRIGHT_RUNTIME_LANE = runtimeSelection.lane
    if (runtimeSelection.baseURL) {
        healthArgs.push("--frontend-url", runtimeSelection.baseURL)
    }

    if (runtimeEnv.PLAYWRIGHT_LOCAL_DEV_BACKEND_URL) {
        healthArgs.push(
            "--backend-url",
            runtimeEnv.PLAYWRIGHT_LOCAL_DEV_BACKEND_URL,
        )
    }

    if (runtimeEnv.PLAYWRIGHT_E2E_HEALTH_TIMEOUT_MS) {
        healthArgs.push(
            "--timeout-ms",
            runtimeEnv.PLAYWRIGHT_E2E_HEALTH_TIMEOUT_MS,
        )
    }

    const result = spawnSync(process.execPath, healthArgs, {
        cwd: process.cwd(),
        env: runtimeEnv,
        stdio: "inherit",
    })

    if (result.error) {
        throw result.error
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1)
    }
}

function loadCaseManifests() {
    const casesRoot = path.resolve(process.cwd(), "e2e/cases")

    try {
        return readdirSync(casesRoot, { withFileTypes: true })
            .filter(
                (entry) =>
                    entry.isFile() &&
                    entry.name.endsWith(".json") &&
                    entry.name !== "case.schema.json",
            )
            .map((entry) => {
                const manifestPath = path.join(casesRoot, entry.name)
                return JSON.parse(readFileSync(manifestPath, "utf8"))
            })
    } catch {
        return []
    }
}

function normalizeRuntimeLane(value) {
    const normalizedValue = value.trim().toLowerCase()

    if (normalizedValue === "local-e2e" || normalizedValue === "local-dev") {
        return normalizedValue
    }

    throw new Error(
        `Unknown runtime lane "${value}". Expected one of: local-e2e, local-dev.`,
    )
}

function getManifestProjectOverride(manifest) {
    const explicitProjects = parseTokens(manifest?.execution?.project).map(
        normalizeProjectName,
    )

    if (explicitProjects.length > 0) {
        return [...new Set(explicitProjects)]
    }

    const browserOverride = manifest?.execution?.browser?.trim()

    return browserOverride ? [normalizeProjectName(browserOverride)] : []
}

function normalizeProjectName(value) {
    const normalizedValue = value.trim().toLowerCase()
    const aliases = {
        pc: "chromium",
        desktop: "chromium",
        chrome: "chromium",
        chromium: "chromium",
        firefox: "firefox",
        safari: "webkit",
        webkit: "webkit",
        phone: "iphone-14",
        smartphone: "iphone-14",
        mobile: "iphone-14",
        iphone: "iphone-14",
        "iphone-14": "iphone-14",
        tablet: "ipad-pro-11",
        ipad: "ipad-pro-11",
        "ipad-pro-11": "ipad-pro-11",
        android: "android-pixel-7",
        "android-pixel-7": "android-pixel-7",
    }

    return aliases[normalizedValue] ?? normalizedValue
}

function parseTokens(value) {
    return (value ?? "")
        .split(/[\s,]+/)
        .map((token) => token.trim())
        .filter(Boolean)
}

function quoteForCmd(value) {
    if (!/[\s"&^|<>]/.test(value)) {
        return value
    }

    return `"${value.replace(/"/g, '\\"')}"`
}
