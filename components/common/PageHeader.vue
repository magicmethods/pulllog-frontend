<script setup lang="ts">
defineProps<{
    title?: string
    // 以下は必要に応じてadPropsにまとめて渡すことも可
    adProps?: AdProps
}>()
</script>

<template>
    <div class="w-full mb-4">
        <CommonEmbedAd v-bind="adProps" />
        <h1 v-if="title"
            class="text-lg font-semibold mb-2 border-t-0 border-b border-surface-300 dark:border-gray-600 text-surface-600 dark:text-gray-200"
        >{{ title }}</h1>
    </div>
</template>
