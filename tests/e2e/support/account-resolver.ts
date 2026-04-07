export interface E2EAccountCredentials {
    key: string
    email: string
    password: string
}

interface AccountEnvPair {
    emailKeys: string[]
    passwordKeys: string[]
}

const accountEnvPairs: Record<string, AccountEnvPair> = {
    standard_user: {
        emailKeys: [
            "PLAYWRIGHT_E2E_STANDARD_USER_EMAIL",
            "E2E_ACCOUNT_STANDARD_USER_EMAIL",
            "PLAYWRIGHT_E2E_EMAIL",
        ],
        passwordKeys: [
            "PLAYWRIGHT_E2E_STANDARD_USER_PASSWORD",
            "E2E_ACCOUNT_STANDARD_USER_PASSWORD",
            "PLAYWRIGHT_E2E_PASSWORD",
        ],
    },
    admin_user: {
        emailKeys: [
            "PLAYWRIGHT_E2E_ADMIN_USER_EMAIL",
            "E2E_ACCOUNT_ADMIN_USER_EMAIL",
        ],
        passwordKeys: [
            "PLAYWRIGHT_E2E_ADMIN_USER_PASSWORD",
            "E2E_ACCOUNT_ADMIN_USER_PASSWORD",
        ],
    },
    read_only_user: {
        emailKeys: [
            "PLAYWRIGHT_E2E_READ_ONLY_USER_EMAIL",
            "E2E_ACCOUNT_READ_ONLY_USER_EMAIL",
        ],
        passwordKeys: [
            "PLAYWRIGHT_E2E_READ_ONLY_USER_PASSWORD",
            "E2E_ACCOUNT_READ_ONLY_USER_PASSWORD",
        ],
    },
}

/**
 * Resolves manifest account keys into environment-backed credentials.
 */
export function resolveAccountCredentials(
    accountKey: string,
): E2EAccountCredentials | null {
    const normalizedKey = accountKey.trim().toLowerCase()

    if (normalizedKey === "anonymous") {
        return null
    }

    const normalizedEnvKey = normalizedKey
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
    const defaultPair = {
        emailKeys: [
            `PLAYWRIGHT_E2E_${normalizedEnvKey}_EMAIL`,
            `E2E_ACCOUNT_${normalizedEnvKey}_EMAIL`,
        ],
        passwordKeys: [
            `PLAYWRIGHT_E2E_${normalizedEnvKey}_PASSWORD`,
            `E2E_ACCOUNT_${normalizedEnvKey}_PASSWORD`,
        ],
    }
    const candidatePair = accountEnvPairs[normalizedKey] ?? defaultPair
    const email = readFirstEnv(candidatePair.emailKeys)
    const password = readFirstEnv(candidatePair.passwordKeys)

    if (!email || !password) {
        throw new Error(
            [
                `Missing E2E credentials for account key "${accountKey}".`,
                `Set one of these email variables: ${candidatePair.emailKeys.join(", ")}`,
                `Set one of these password variables: ${candidatePair.passwordKeys.join(", ")}`,
            ].join(" "),
        )
    }

    return {
        key: normalizedKey,
        email,
        password,
    }
}

function readFirstEnv(keys: string[]): string | undefined {
    for (const key of keys) {
        const value = process.env[key]?.trim()
        if (value) {
            return value
        }
    }

    return undefined
}
