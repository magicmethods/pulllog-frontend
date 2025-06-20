<script setup lang="ts">

// Ad Setting
const adConfig: Record<string, AdProps> = {
    default: {
        //adWidth: 468,
        //adHeight: 60,
        //adText: 'フルバナー広告',
        adItems: [{ image: '/sample/ad_1.jpg', link: 'https://example.com', alt: '広告1' }],
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
