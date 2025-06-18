<script setup lang="ts">

// 必要に応じてprops設計を拡張
const props = defineProps<{
    adWidth?: number
    adHeight?: number
    adText?: string
}>()

const adSize = {
    width: props.adWidth ? `${props.adWidth}px` : '100%',
    height: props.adHeight ? `${props.adHeight}px` : '250px',
}

</script>

<template>
    <div class="relative w-full h-max my-2">
        <div
            class="mx-auto bg-surface-200 dark:bg-gray-700 rounded flex items-center justify-center text-surface-400 dark:text-gray-500"
            :style="adSize"
        >
            {{ adText || 'インライン広告' }}
        </div>
    </div>
</template>
