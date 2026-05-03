import http from "node:http"
import https from "node:https"

const args = parseArgs(process.argv.slice(2))
const lane = normalizeLane(args.lane ?? process.env.PLAYWRIGHT_RUNTIME_LANE)
const timeoutMs = parseTimeout(args.timeoutMs)

if (lane !== "local-dev") {
    process.stdout.write(
        `[e2e-health] Runtime lane ${lane} does not require a preflight health check.\n`,
    )
    process.exit(0)
}

const frontendURL =
    args.frontendUrl ??
    process.env.PLAYWRIGHT_LOCAL_DEV_FRONTEND_URL ??
    "https://pull.log:4649"
const backendURL =
    args.backendUrl ??
    process.env.PLAYWRIGHT_LOCAL_DEV_BACKEND_URL ??
    "http://127.0.0.1:3030/api/v1/dummy"

try {
    await assertHealthy({
        name: "frontend",
        url: frontendURL,
        timeoutMs,
        acceptStatus: (statusCode) => statusCode >= 200 && statusCode < 400,
    })
    await assertFrontendAuthProxyReady({
        frontendURL,
        timeoutMs,
    })
    await assertHealthy({
        name: "backend",
        url: backendURL,
        timeoutMs,
        acceptStatus: (statusCode) => statusCode === 200,
    })

    process.stdout.write(
        `[e2e-health] local-dev ready: frontend=${frontendURL}, backend=${backendURL}\n`,
    )
} catch (error) {
    process.stderr.write(
        `[e2e-health] ${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exit(1)
}

function parseArgs(rawArgs) {
    const parsed = {}
    let pendingKey = null

    for (const arg of rawArgs) {
        if (arg === "--") {
            continue
        }

        if (arg.startsWith("--lane=")) {
            parsed.lane = arg.slice("--lane=".length)
            continue
        }

        if (arg.startsWith("--frontend-url=")) {
            parsed.frontendUrl = arg.slice("--frontend-url=".length)
            continue
        }

        if (arg.startsWith("--backend-url=")) {
            parsed.backendUrl = arg.slice("--backend-url=".length)
            continue
        }

        if (arg.startsWith("--timeout-ms=")) {
            parsed.timeoutMs = arg.slice("--timeout-ms=".length)
            continue
        }

        if (pendingKey) {
            parsed[pendingKey] = arg
            pendingKey = null
            continue
        }

        switch (arg) {
            case "--lane":
                pendingKey = "lane"
                break
            case "--frontend-url":
                pendingKey = "frontendUrl"
                break
            case "--backend-url":
                pendingKey = "backendUrl"
                break
            case "--timeout-ms":
                pendingKey = "timeoutMs"
                break
            default:
                throw new Error(`Unknown argument: ${arg}`)
        }
    }

    if (pendingKey) {
        throw new Error(
            `Missing value for --${pendingKey.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`,
        )
    }

    return parsed
}

function normalizeLane(value) {
    const normalizedValue = (value ?? "local-e2e").trim().toLowerCase()

    if (normalizedValue === "local-e2e" || normalizedValue === "local-dev") {
        return normalizedValue
    }

    throw new Error(
        `Unknown runtime lane "${value}". Expected one of: local-e2e, local-dev.`,
    )
}

function parseTimeout(value) {
    const parsed = Number.parseInt(value ?? "5000", 10)

    if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid timeout value: ${value}`)
    }

    return parsed
}

function assertHealthy({ name, url, timeoutMs, acceptStatus }) {
    return new Promise((resolve, reject) => {
        const requestURL = new URL(url)
        const transport = requestURL.protocol === "https:" ? https : http
        const request = transport.request(
            requestURL,
            {
                method: "GET",
                rejectUnauthorized: false,
            },
            (response) => {
                response.resume()

                if (!acceptStatus(response.statusCode ?? 0)) {
                    reject(
                        new Error(
                            `${name} health check failed for ${url}: unexpected HTTP ${response.statusCode ?? "unknown"}.`,
                        ),
                    )
                    return
                }

                resolve()
            },
        )

        request.setTimeout(timeoutMs, () => {
            request.destroy(
                new Error(
                    `${name} health check timed out after ${timeoutMs}ms: ${url}`,
                ),
            )
        })

        request.on("error", (error) => {
            reject(
                new Error(
                    `${name} health check failed for ${url}: ${error.message}`,
                ),
            )
        })

        request.end()
    })
}

function assertFrontendAuthProxyReady({ frontendURL, timeoutMs }) {
    const loginProbeURL = new URL("/api/auth/login", frontendURL).toString()

    return new Promise((resolve, reject) => {
        const requestURL = new URL(loginProbeURL)
        const transport = requestURL.protocol === "https:" ? https : http
        const request = transport.request(
            requestURL,
            {
                method: "POST",
                rejectUnauthorized: false,
                headers: {
                    "content-type": "application/json",
                },
            },
            (response) => {
                response.resume()

                if (response.statusCode === 401) {
                    reject(
                        new Error(
                            `[e2e-health] local-dev auth preflight failed: ${loginProbeURL} returned 401 Unauthorized. Check SECRET_API_KEY in frontend env and API_KEY in backend env.`,
                        ),
                    )
                    return
                }

                if (
                    response.statusCode !== 422 &&
                    response.statusCode !== 400
                ) {
                    reject(
                        new Error(
                            `[e2e-health] local-dev auth preflight expected HTTP 400/422 from ${loginProbeURL} with empty credentials, but got ${response.statusCode ?? "unknown"}.`,
                        ),
                    )
                    return
                }

                resolve()
            },
        )

        request.setTimeout(timeoutMs, () => {
            request.destroy(
                new Error(
                    `local-dev auth preflight timed out after ${timeoutMs}ms: ${loginProbeURL}`,
                ),
            )
        })

        request.on("error", (error) => {
            reject(
                new Error(
                    `local-dev auth preflight failed for ${loginProbeURL}: ${error.message}`,
                ),
            )
        })

        request.write("{}")
        request.end()
    })
}
