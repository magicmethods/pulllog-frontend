<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { StorageUtil } from "~/utils/storage"

// i18n
const { t } = useI18n()

const storage = ref()

onMounted(() => {
    storage.value = new StorageUtil()
    // テーマ設定があればそれを適用し、なければシステムの設定に従う
    const savedTheme = storage.value.getItem("theme")
    const html = document.documentElement
    html.classList.add("theme-switching")
    if (savedTheme) {
        html.classList.toggle("app-dark", savedTheme === "dark")
    } else {
        const prefersDarkMode = window.matchMedia(
            "(prefers-color-scheme: dark)",
        ).matches
        html.classList.toggle("app-dark", prefersDarkMode)
    }
    void html.offsetWidth
    requestAnimationFrame(() => {
        html.classList.remove("theme-switching")
    })
})
</script>

<template>
    <div class="flex flex-col h-screen justify-center items-center bg-surface-100 dark:bg-gray-900">
        <Head>
            <Title>{{ t('app.name') }}</Title>
            <Meta name="description" :content="t('app.description')" />
            <Meta name="keywords" :content="t('app.keywords')" />
        </Head>
        <div class="w-full max-w-sm p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <slot />
        </div>
    </div>
</template>