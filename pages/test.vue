<script setup lang="ts">

const statusCode: number = 500
const title: string = statusCode === 404 ? 'ページが見つかりません' : 'エラーが発生しました'
const message: string = '申し訳ありません。問題が発生しました'

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
    <div class="flex flex-col min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
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
                ホームへ戻る
            </button>
        </div>
    </div>
</template>
