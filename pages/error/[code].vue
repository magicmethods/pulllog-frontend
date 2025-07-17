<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

definePageMeta({
    layout: 'error'
})

const route = useRoute()
const { t } = useI18n()

// Refs & Local variables
const statusCode = Number(route.params.code || 500)
const title: string = statusCode === 404 ? t('app.error.notFound') : t('app.error.errorOccurred')
const message: string = t('app.error.sorrySomethingWentWrong')

const goHome = () => {
    window.location.href = '/'
}

onMounted(() => {
    const headerElement = document.querySelector('header')
    if (headerElement) {
        headerElement.classList.add('hidden')
        const mainElement = document.querySelector('main')
        if (mainElement) {
            mainElement.setAttribute('style', 'height: 100vh; overflow: hidden')
        }
    }
})

</script>

<template>
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg px-8 py-10 max-w-md w-full text-center">
        <div class="mb-6">
            <h1 class="text-5xl font-bold text-rose-600 dark:text-rose-400 mb-2">
                {{ statusCode }}
            </h1>
            <p class="text-xl font-semibold text-gray-700 dark:text-gray-200">
                {{ title }}
            </p>
        </div>
        <p class="text-gray-500 dark:text-gray-400 mb-8">
            {{ message }}
        </p>
        <button
            class="mt-4 px-6 py-2 rounded-2xl bg-primary-600 text-white hover:bg-primary-700 transition"
            @click="goHome"
        >
            {{ t('app.backToHome') }}
        </button>
    </div>
</template>
