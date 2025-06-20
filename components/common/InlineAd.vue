<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'

// 必要に応じてprops設計を拡張
const props = defineProps<{
    adWidth?: number
    adHeight?: number
    adText?: string
    adSrc?: string | string[]
}>()

// Stores
const userStore = useUserStore()

const isShownAd = computed<boolean>(() => userStore.user?.plan === 'free')
const adSize = {
    width: props.adWidth ? `${props.adWidth}px` : '100%',
    height: props.adHeight ? `${props.adHeight}px` : '250px',
}
const adImage = computed(() => {
    if (!props.adSrc) return null
    if (typeof props.adSrc === 'string') return props.adSrc
    if (Array.isArray(props.adSrc) && props.adSrc.length > 0) {
        const randomIndex = Math.floor(Math.random() * props.adSrc.length)
        return props.adSrc[randomIndex]
    }
    return null
})

</script>

<template>
    <div v-if="isShownAd" class="relative w-full h-max my-2">
        <Image v-if="adImage" :src="adImage" :alt="adText" imageClass="w-full h-auto rounded" />
        <div v-else
            class="mx-auto bg-surface-200 dark:bg-gray-700 rounded flex items-center justify-center text-surface-400 dark:text-gray-500"
            :style="adSize"
        >
            {{ adText || 'インライン広告' }}
        </div>
    </div>
</template>
