<script setup lang="ts">
const props = withDefaults(defineProps<{
    fileName?: string
    width?: number
    poster?: string
}>(), {
    fileName: 'demo-v1.mp4',
    width: 800,
    poster: ''
})

const srcMp4 = `${useConfig().assetBaseURL}/video/${props.fileName}`
const srcWebm = srcMp4.replace(/\.mp4$/i, '.webm')
</script>

<template>
    <div class="inline-block rounded-xl overflow-hidden shadow-lg">
        <video
            :width="width"
            autoplay
            loop
            muted
            playsinline
            preload="metadata"
            :poster="poster || undefined"
            class="relative block w-full h-auto bg-black"
            style="width: calc(100% + 2px); right: -2px;"
        >
            <source :src="srcMp4" type="video/mp4" />
            <source :src="srcWebm" type="video/webm" />
            Your browser does not support the video tag.
        </video>
    </div>
</template>
