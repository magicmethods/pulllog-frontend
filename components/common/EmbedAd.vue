<script setup lang="ts">
import { useI18n } from "vue-i18n"

type AdProps = {
    adWidth?: number
    adHeight?: number
    adText?: string
    adItems?: AdItem[]
    adHtml?: string
    adSlotName?: string
    adClient?: string
    adType?: "image" | "carousel" | "html" | "slot" | "none"
    adFormat?: string
    adResponsive?: string
    adStyle?: string
    disableForPlan?: string
}

// Props
const props = defineProps<AdProps>()

// Composables etc.
const appConfig = useConfig()
const { isShownAd } = useAdManager(props.disableForPlan)
const { t } = useI18n()

// Refs & Local state
const insEl = ref<HTMLElement | null>(null)
const adClientId = props.adClient || appConfig.adsenseAccount
const adSize = {
    width: props.adWidth ? `${props.adWidth}px` : "auto",
    height: props.adHeight ? `${props.adHeight}px` : "auto",
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
    if (
        props.adType === "carousel" &&
        props.adItems &&
        props.adItems.length > 0
    ) {
        return {
            viewport: {
                class: ["flex-1 w-max", props.adWidth ? "" : "max-w-full"],
                style: props.adWidth ? { maxWidth: `${props.adWidth}px` } : {},
            },
            item: "flex justify-center items-center",
            pcPrevButton: { root: "hidden md:inline-block" },
            pcNextButton: { root: "hidden md:inline-block" },
        }
    }
    return undefined
})
const hideAd = computed(() => {
    // adTypeがnoneの場合は広告を表示しない
    return props.adType === "none"
})

// Methods
function handleClickAd(link: string | undefined) {
    if (link && window) {
        // 広告クリック分析処理等があればここに追加
        window.open(link, "_blank")
    }
}
// Adsense: insタグ挿入後にpush({})を呼ぶ
function loadAdsense() {
    if (window && "adsbygoogle" in window) {
        try {
            window.adsbygoogle = window.adsbygoogle || []
            // biome-ignore lint:/suspicious/noExplicitAnylint
            ;(window.adsbygoogle as any).push({})
        } catch (e) {
            // すでに読み込まれていた場合のエラー抑止
        }
    }
}

onMounted(() => {
    //console.debug('EmbedAd mounted', isShownAd.value, adClientId)
    if (props.adType === "slot" && adClientId && props.adSlotName) {
        // adType="slot" の時だけpushする
        nextTick(() => loadAdsense())
    }
})

// Watchers
watch(
    () => props.adType,
    (val) => {
        // SSRや動的切り替え対応：adTypeやslot切り替え時にもpushする
        if (val === "slot" && adClientId && props.adSlotName) {
            nextTick(() => loadAdsense())
        }
    },
)

// Styles
const adContainerClass = computed(() => {
    return [
        "flex items-center justify-center text-center font-semibold text-lg",
        `
        text-surface-700/50 dark:text-gray-400/60
        border-2 border-dashed border-surface-600/50 dark:border-gray-400/30 rounded-sm py-3
        bg-surface-200/30 dark:bg-gray-700/30
    `,
    ].join(" ")
})
</script>

<template>
    <div v-if="isShownAd && !hideAd" class="relative w-full h-max mt-0 md:mt-2 mb-2 p-0">
        <div v-if="adType === 'image' && adImage"
            class="flex items-center justify-center mx-auto max-w-full"
            :style="adSize"
        >
            <Image
                :src="adImage.image"
                :alt="adImage.alt || t('app.ad.advertisement')"
                :imageClass="'w-max h-max cursor-pointer'"
                @click="handleClickAd(adImage.link)"
            />
        </div>

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
                    <Image :src="slotProps.data.image" :alt="slotProps.data.alt ?? t('app.ad.advertisement')" imageClass="w-max h-auto" />
                </a>
                <Image v-else :src="slotProps.data.image" :alt="slotProps.data.alt ?? t('app.ad.advertisement')" imageClass="w-max h-auto" />
            </template>
        </Carousel>

        <div v-else-if="adType === 'html' && adHtml" v-html="adHtml" :style="adSize" />

        <div v-else-if="adType === 'slot' && adClientId && adSlotName" :style="adSize">
            <ins
                ref="insEl"
                class="adsbygoogle"
                :style="adStyle ?? 'display:block'"
                :data-ad-client="adClientId"
                :data-ad-slot="adSlotName"
                :data-ad-format="adFormat ?? 'auto'"
                :data-full-width-responsive="adResponsive ?? 'true'"
            ></ins>
        </div>

        <slot v-else name="ad">
            <div :class="adContainerClass" :style="`${adSize}`"
            >{{ adText || t('app.ad.advertisement') }}</div>
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