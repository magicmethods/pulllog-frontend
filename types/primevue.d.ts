import type { ThemeOptions } from "@primevue/nuxt-module"

declare module "nuxt/schema" {
    interface NuxtConfig {
        primevue?: {
            options?: ThemeOptions
            // 他の PrimeVue の設定オプションがあればここに追加
        }
    }
}
