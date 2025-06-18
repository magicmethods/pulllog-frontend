<script setup lang="ts">
import { StorageUtil } from '~/utils/storage'

const storage = new StorageUtil()

onMounted(() => {
    // テーマ設定があればそれを適用し、なければシステムの設定に従う
    const savedTheme = storage.getItem('theme')
    const html = document.documentElement
    html.classList.add('theme-switching')
    if (savedTheme) {
        html.classList.toggle('app-dark', savedTheme === 'dark')
    } else {
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
        html.classList.toggle('app-dark', prefersDarkMode)
    }
    void html.offsetWidth
    requestAnimationFrame(() => {
        html.classList.remove('theme-switching')
    })
})

</script>

<template>
    <div class="flex flex-col h-screen justify-center items-center bg-surface-100 dark:bg-gray-900">
        <div class="w-full max-w-sm p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <slot />
        </div>
    </div>
</template>