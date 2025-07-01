<script setup lang="ts">

// Ad Setting
const adConfig: Record<string, AdProps> = {
    default: {
        adItems: [
            { image: '/sample/ad_1.jpg',  link: 'https://example.com', alt: '広告1 (500x220)' },
            { image: '/sample/ad_12.jpg', link: 'https://example.com', alt: '広告12 (1440x550)' },
            { image: '/sample/ad_13.jpg', link: 'https://example.com', alt: '広告13 (1200x675)' },
        ],
        adType: 'image',
    },
}

</script>

<template>
    <div class="w-full p-4">
        <CommonPageHeader
            title="統計分析"
            :adProps="adConfig.default"
        />
        <!-- Page Content -->
    </div>
</template>
