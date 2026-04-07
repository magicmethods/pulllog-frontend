import { spawn } from "node:child_process"
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
        env.PLAYWRIGHT_PROJECTS = appendValue(
            env.PLAYWRIGHT_PROJECTS,
            value,
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
        `[run-e2e] Applying manifest project override: ${implicitProjects}\n`,
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
    const caseIds = parseTokens(
        runtimeEnv.PLAYWRIGHT_CASE_IDS ?? runtimeEnv.PLAYWRIGHT_CASE_ID,
    ).map((value) => value.toLowerCase())
    const caseTags = parseTokens(
        runtimeEnv.PLAYWRIGHT_CASE_TAGS ?? runtimeEnv.PLAYWRIGHT_CASE_TAG,
    ).map((value) => value.toLowerCase())
    const requestedEnv = runtimeEnv.PLAYWRIGHT_CASE_ENV?.trim().toLowerCase()
    const manifests = loadCaseManifests()
    const selectedManifests = manifests.filter((manifest) => {
        if (!manifest?.enabled) {
            return false
        }

        if (
            caseIds.length > 0 &&
            !caseIds.includes(manifest.id?.trim().toLowerCase())
        ) {
            return false
        }

        if (requestedEnv && manifest.env?.trim().toLowerCase() !== requestedEnv) {
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

    if (selectedManifests.length === 0) {
        return undefined
    }

    const overrides = selectedManifests
        .map((manifest) => getManifestProjectOverride(manifest))
        .filter(Boolean)

    if (overrides.length !== selectedManifests.length) {
        return undefined
    }

    const uniqueOverrides = [...new Set(overrides)]
    return uniqueOverrides.length === 1 ? uniqueOverrides[0] : undefined
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

function getManifestProjectOverride(manifest) {
    return (
        manifest?.execution?.project?.trim() ||
        manifest?.execution?.browser?.trim() ||
        undefined
    )
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
