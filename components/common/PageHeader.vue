<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'

// Props - 必要に応じてprops設計を拡張
const props = defineProps<{
    title?: string
    adWidth?: number
    adHeight?: number
    adText?: string
    adSrc?: string
    adItems?: Record<string, string>[]
}>()

// Stores
const userStore = useUserStore()

const isShownAd = computed<boolean>(() => userStore.user?.plan === 'free')
const adSize = {
    width: props.adWidth ? `${props.adWidth}px` : '1200px',
    height: props.adHeight ? `${props.adHeight}px` : '80px',
}

</script>

<template>
    <div class="w-full mb-4">
        <!-- 広告バナー -->
        <div v-if="isShownAd" :class="{ 'mx-auto w-max': !adItems || adItems.length === 0 }">
            <Image v-if="adSrc" :src="adSrc" :alt="adText" imageClass="w-full h-auto" />
            <Carousel v-else-if="adItems && adItems.length > 0"
                :value="adItems"
                :numVisible="1"
                :numScroll="1"
                :autoplayInterval="6000"
                :circular="true"
                containerClass="mx-auto w-full h-auto mb-0"
                contentClass="flex items-center justify-center mb-0"
                :pt:viewport="'flex-1 w-max max-w-[1000px]'"
            >
                <template #item="slotProps">
                    <div class="flex items-center justify-center w-full h-full">
                        <Image :src="slotProps.data.image" alt="広告バナー" imageClass="w-max h-auto" />
                    </div>
                </template>
            </Carousel>
            <slot v-else name="ad">
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
