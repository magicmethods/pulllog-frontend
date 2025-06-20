<script setup lang="ts">

// Ad Setting
const adConfig: Record<string, AdProps> = {
    default: {
        //adWidth: 728,
        //adHeight: 90,
        //adText: 'リーダーボード広告',
        adItems: [{ image: '/sample/ad_3.jpg', link: 'https://example.com', alt: '広告1' }],
        adType: 'image',
    },
}

</script>

<template>
    <div class="w-full p-4">
        <CommonPageHeader
            title="アプリ管理"
            :adProps="adConfig.default"
        />
        <!-- Page Content -->

    </div>
</template>