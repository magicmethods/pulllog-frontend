<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLoaderStore } from '~/stores/useLoaderStore'

const loaderStore = useLoaderStore()
const { t } = useI18n()

const props = defineProps<{
    imageCacheParam: string
}>()

const isLoading = ref<boolean>(true)
const loaderId = ref<string | null>(null)
const sectionRef = ref<HTMLElement | null>(null)

const ver = computed(() => `?v=${encodeURIComponent(props.imageCacheParam)}`)

const statItems = computed(() => ([
    {
        title: t('landing.statistics.stat1.title'),
        desc: t('landing.statistics.stat1.describe'),
        image: `/images/chart-image1.webp${ver.value}`,
        animate: { enterClass: 'animate-enter fade-in-10 zoom-in-50 animate-duration-1000' },
    },
    {
        title: t('landing.statistics.stat2.title'),
        desc: t('landing.statistics.stat2.describe'),
        image: `/images/chart-image2.webp${ver.value}`,
        animate: { enterClass: 'animate-enter fade-in-10 zoom-in-75 animate-duration-1000' },
    },
    {
        title: t('landing.statistics.stat3.title'),
        desc: t('landing.statistics.stat3.describe'),
        image: `/images/chart-image3.webp${ver.value}`,
        animate: { enterClass: 'animate-enter fade-in-10 zoom-in-50 animate-duration-1000' },
    },
    {
        title: t('landing.statistics.stat4.title'),
        desc: t('landing.statistics.stat4.describe'),
        image: `/images/chart-image4.webp${ver.value}`,
        animate: { enterClass: 'animate-enter fade-in-10 slide-in-from-l-8 animate-duration-1000', leaveClass: 'animate-leave fade-out-0' },
    },
    {
        title: t('landing.statistics.stat5.title'),
        desc: t('landing.statistics.stat5.describe'),
        image: `/images/chart-image5.webp${ver.value}`,
        animate: { enterClass: 'animate-enter fade-in-10 spin-in-[-45deg] slide-in-from-b-16 animate-duration-1000' },
    },
    {
        title: t('landing.statistics.stat6.title'),
        desc: t('landing.statistics.stat6.describe'),
        image: `/images/chart-image6.webp${ver.value}`,
        animate: { enterClass: 'animate-enter fade-in-10 slide-in-from-r-8 animate-duration-1000', leaveClass: 'animate-leave fade-out-0' },
    },
    {
        title: t('landing.statistics.stat7.title'),
        desc: t('landing.statistics.stat7.describe'),
        image: `/images/chart-image7.webp${ver.value}`,
        animate: { enterClass: 'animate-enter fade-in-10 zoom-in-50 slide-in-from-t-20 animate-duration-1000' },
    },
]))

onMounted(async () => {
    loaderId.value = loaderStore.show('', sectionRef.value ?? undefined)
    await nextTick()
    loaderStore.hide(loaderId.value)
    isLoading.value = false
})

// PassThrough
const cardPT = {
    root: {
        class: 'w-full! sm:w-[calc(calc(100%_/_2)_-_2rem)]! md:w-[calc(calc(100%_/_3)_-_4rem)]! h-auto p-0! gap-4 rounded-xl shadow-lg overflow-hidden!',
    },
    header: 'w-full! p-0 border-b border-surface-400 dark:border-gray-700 bg-white',
    body: 'items-center! gap-0!',
    title: 'mx-auto! text-lg font-bold',
    content: 'min-h-[8rem] p-4 text-base text-primary-900 dark:text-white',
}
const imagePT = {
    root: 'w-auto h-full',
    image: 'h-40 w-auto mx-auto',
    previewIcon: 'text-primary-500 hover:text-primary-400',
    zoomInButton: 'hidden',
    zoomOutButton: 'hidden',
    originalContainer: 'rounded-lg shadow-lg overflow-hidden',
}

</script>

<template>
    <section id="statistics" ref="sectionRef" class="w-full mb-4">
        <div v-if="!isLoading" class="flex flex-col items-center justify-center gap-4">
            <h2 class="text-primary-800 dark:text-primary-300 font-bold text-3xl text-center">
                <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-8 h-8 inline-block mr-2 ld ld-jump" />
                {{ t('landing.statistics.title') }}
            </h2>
            <p class="py-4 text-xl text-primary-800 dark:text-primary-300 text-center">{{ t('landing.statistics.description') }}</p>
            <div class="flex flex-wrap justify-center gap-8">
                <Card
                    v-for="(item, index) in statItems"
                    :key="index"
                    v-animateonscroll="item.animate"
                    :pt="cardPT"
                >
                    <template #header>
                        <Image :src="item.image" :preview="false" :pt="imagePT" />
                    </template>
                    <template #title>{{ item.title }}</template>
                    <template #content>
                        <p class="text-center">{{ item.desc }}</p>
                    </template>
                </Card>
            </div>
        </div>
    </section>
</template>
