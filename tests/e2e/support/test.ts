import { test as base, expect, type Page } from "@playwright/test"
import { E2EScenarioArtifacts } from "./scenario-reporting"

export interface E2EScenarioContext {
    page: Page
    artifacts: E2EScenarioArtifacts
    capturePageArrival(pageName: string): Promise<void>
    captureBeforeCommit(pageName: string, action: string): Promise<void>
    captureCheckpoint(pageName: string, action: string): Promise<void>
    note(message: string): void
}

export const test = base.extend<{ scenario: E2EScenarioContext }>({
    scenario: async ({ page }, use, testInfo) => {
        const artifacts = new E2EScenarioArtifacts(page, testInfo)
        const scenario: E2EScenarioContext = {
            page,
            artifacts,
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
