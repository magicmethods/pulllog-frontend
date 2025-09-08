<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"

// i18n
const route = useRoute()
const { t } = useI18n()

// Refs & Local variables
const statusCode = Number(route.params.code || 500)
</script>

<template>
    <div class="flex flex-col min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Head>
            <Title>{{ statusCode }} Error - {{ t('app.name') }}</Title>
            <Meta name="description" :content="t('app.description')" />
            <Meta name="keywords" :content="t('app.keywords')" />
        </Head>
        <slot />
    </div>
</template>
