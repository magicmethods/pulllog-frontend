import { test as base, expect, type Page } from "@playwright/test"
import {
    type E2EAccountCredentials,
    resolveAccountCredentials,
} from "./account-resolver"
import { annotateCase, type E2ECaseManifest } from "./case-manifest"
import { E2EScenarioArtifacts } from "./scenario-reporting"

export interface E2EScenarioContext {
    page: Page
    artifacts: E2EScenarioArtifacts
    useCaseManifest(manifest: E2ECaseManifest): void
    getCaseManifest(): E2ECaseManifest | null
    requireCaseManifest(): E2ECaseManifest
    requireAccount(): E2EAccountCredentials
    capturePageArrival(pageName: string): Promise<void>
    captureBeforeCommit(pageName: string, action: string): Promise<void>
    captureCheckpoint(pageName: string, action: string): Promise<void>
    note(message: string): void
}

export const test = base.extend<{ scenario: E2EScenarioContext }>({
    scenario: async ({ page }, use, testInfo) => {
        const artifacts = new E2EScenarioArtifacts(page, testInfo)
        let activeManifest: E2ECaseManifest | null = null
        let activeAccount: E2EAccountCredentials | null = null

        const scenario: E2EScenarioContext = {
            page,
            artifacts,
            useCaseManifest: (manifest: E2ECaseManifest) => {
                activeManifest = manifest
                activeAccount = null
                artifacts.setCaseManifest(manifest)
                annotateCase(testInfo, manifest)
            },
            getCaseManifest: () => activeManifest,
            requireCaseManifest: () => {
                if (!activeManifest) {
                    throw new Error(
                        "Call scenario.useCaseManifest(manifest) before using E2E helpers.",
                    )
                }

                return activeManifest
            },
            requireAccount: () => {
                if (!activeManifest) {
                    throw new Error(
                        "No account credentials were resolved. Call scenario.useCaseManifest(manifest) first.",
                    )
                }

                if (!activeAccount) {
                    const resolvedAccount = resolveAccountCredentials(
                        activeManifest.account.key,
                    )

                    if (!resolvedAccount) {
                        throw new Error(
                            `The active case "${activeManifest.id}" requires credentials, but the account key "${activeManifest.account.key}" resolved to an anonymous profile.`,
                        )
                    }

                    activeAccount = resolvedAccount
                }

                return activeAccount
            },
            capturePageArrival: async (pageName: string) => {
                await artifacts.capturePageArrival(pageName)
            },
            captureBeforeCommit: async (pageName: string, action: string) => {
                await artifacts.captureBeforeCommit(pageName, action)
            },
            captureCheckpoint: async (pageName: string, action: string) => {
                await artifacts.captureCheckpoint(pageName, action)
            },
            note: (message: string) => {
                artifacts.addNote(message)
            },
        }

        try {
            await use(scenario)
        } finally {
            await artifacts.finalize()
        }
    },
})

export { expect }
