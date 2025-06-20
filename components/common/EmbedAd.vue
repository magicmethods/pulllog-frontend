<script setup lang="ts">
//import type { AdItem, AdProps } from '~/types/global.d.ts'

type AdItem = {
    image: string
    link?: string
    alt?: string
    text?: string // テキストバナー対応も可
    // 追加情報あればここに
}
type AdProps = {
    adWidth?: number
    adHeight?: number
    adText?: string
    adItems?: AdItem[]
    adHtml?: string
    adSlotName?: string
    adClient?: string
    adType?: 'image' | 'carousel' | 'html' | 'slot'
    disableForPlan?: string
}

const props = defineProps<AdProps>()

const { isShownAd } = useAdManager(props.disableForPlan)

const adSize = {
    width: props.adWidth ? `${props.adWidth}px` : 'auto',
    height: props.adHeight ? `${props.adHeight}px` : 'auto',
}
const adImage = computed(() => {
    if (!props.adItems) return null
    if (Array.isArray(props.adItems) && props.adItems.length > 0) {
        const randomIndex = Math.floor(Math.random() * props.adItems.length)
        return props.adItems[randomIndex]
    }
    return null
})
const carouselPT = computed(() => {
    if (props.adType === 'carousel' && props.adItems && props.adItems.length > 0) {
        return {
            viewport: {
                class: [ 'flex-1 w-max', props.adWidth ? '' : 'max-w-full' ],
                style: props.adWidth ? { maxWidth: `${props.adWidth}px` } : {},
            },
            item: 'flex justify-center items-center',
        }
    }
    return undefined
})


function handleClickAd(link: string | undefined) {
    if (link && window) {
        // 広告クリック分析処理等があればここに追加
        window.open(link, '_blank')
    }
}

</script>

<template>
    <div v-if="isShownAd" class="relative w-full h-max my-2">
        <!-- 画像バナー（単体） -->
        <div v-if="adType === 'image' && adImage"
            class="flex items-center justify-center mx-auto"
            :style="adSize"
        >
            <Image
                :src="adImage.image"
                :alt="adImage.alt || '広告バナー'"
                :imageClass="'w-max h-max rounded cursor-pointer'"
                @click="handleClickAd(adImage.link)"
            />
        </div>

        <!-- 複数バナー（カルーセル） -->
        <Carousel v-else-if="adType === 'carousel' && adItems && adItems.length > 0"
            :value="adItems"
            :numVisible="1"
            :numScroll="1"
            :autoplayInterval="6000"
            :circular="true"
            containerClass="mx-auto w-full h-auto -mb-2"
            contentClass="flex items-center justify-center mb-0"
            :pt="carouselPT"
        >
            <template #item="slotProps">
                <a v-if="slotProps.data.link" @click="handleClickAd(slotProps.data.link)">
                    <Image :src="slotProps.data.image" alt="広告バナー" imageClass="w-max h-auto" />
                </a>
                <Image v-else :src="slotProps.data.image" alt="広告バナー" imageClass="w-max h-auto" />
            </template>
        </Carousel>

        <!-- カスタムHTML広告（Adsense等scriptタグも可） -->
        <div v-else-if="adType === 'html' && adHtml" v-html="adHtml" :style="adSize" />

        <!-- slot広告: 例えばadsenseの<ins>タグなど -->
        <div v-else-if="adType === 'slot'" :style="adSize">
            <ins
                class="adsbygoogle"
                :style="'display:block;'"
                :data-ad-client="adClient"
                :data-ad-slot="adSlotName"
                :data-ad-format="'auto'"
                :data-full-width-responsive="'true'"
            ></ins>
        </div>

        <!-- スロット挿入 or デフォルトバナー -->
        <slot v-else name="ad">
            <div class="bg-surface-200 dark:bg-gray-700 rounded flex items-center justify-center text-surface-400 dark:text-gray-500"
                :style="adSize"
            >{{ adText || '広告スペース' }}</div>
        </slot>
    </div>
</template>

<style lang="scss" scoped>
.p-carousel {
    .p-image {
        cursor: pointer;
    }
}
</style>