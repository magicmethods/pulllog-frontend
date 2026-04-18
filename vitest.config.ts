import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
    resolve: {
        alias: {
            "~": path.resolve(__dirname),
            "@": path.resolve(__dirname),
        },
    },
    test: {
        include: ["tests/unit/**/*.spec.ts"],
        exclude: ["tests/e2e/**", "e2e/**"],
    },
})
