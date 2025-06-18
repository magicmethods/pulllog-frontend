<script setup lang="ts">

// 必要に応じてprops設計を拡張
const props = defineProps<{
    title?: string
    adWidth?: number
    adHeight?: number
    adText?: string
}>()

const adSize = {
    width: props.adWidth ? `${props.adWidth}px` : '1200px',
    height: props.adHeight ? `${props.adHeight}px` : '80px',
}

</script>

<template>
    <div class="w-full mb-4">
        <!-- 広告バナー -->
        <div class="mx-auto w-max">
            <slot name="ad">
                <!-- デフォルトのバナー -->
                <div class="bg-surface-200 dark:bg-gray-700 rounded flex items-center justify-center text-surface-400 dark:text-gray-500"
                    :style="adSize"
                >{{ adText || '広告バナー' }}</div>
            </slot>
        </div>
        <!-- 必要ならタイトル -->
        <h1 v-if="title"
            class="text-lg font-semibold mb-2 border-t-0 border-b border-surface-300 dark:border-gray-600 text-surface-600 dark:text-gray-200"
        >{{ title }}</h1>
    </div>
</template>
