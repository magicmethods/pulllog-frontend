<script setup lang="ts">
import { useI18n } from 'vue-i18n'

// Props
const props = defineProps<{
    error: {
        statusCode?: number
        statusMessage?: string
        message?: string
        stack?: string
    }
}>()

// i18n
const { t } = useI18n()

// Refs & Local variables
const statusCode = props.error.statusCode || 500
const title = props.error.statusMessage || (statusCode === 404 ? t('app.error.notFound') : t('app.error.errorOccurred'))
const message = props.error.message || t('app.error.sorrySomethingWentWrong')

const goHome = () => {
    window.location.href = '/'
}

</script>

<template>
    <div class="flex flex-col min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg px-8 py-10 max-w-md w-full text-center">
            <div class="mb-6">
                <h1 class="text-5xl font-bold text-primary-600 dark:text-primary-400 mb-2">
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
    </div>
</template>
