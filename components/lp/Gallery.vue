<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { useLoaderStore } from "~/stores/useLoaderStore"

const loaderStore = useLoaderStore()
const { t } = useI18n()

const props = defineProps<{
    imageCacheParam: string
}>()

const isLoading = ref<boolean>(true)
const loaderId = ref<string | null>(null)
const sectionRef = ref<HTMLElement | null>(null)

const ver = computed(() => `?v=${encodeURIComponent(props.imageCacheParam)}`)

onMounted(async () => {
    loaderId.value = loaderStore.show("", sectionRef.value ?? undefined)
    await nextTick()
    loaderStore.hide(loaderId.value)
    isLoading.value = false
})

// PassThrough
const imagePT = (rootSizeClass?: string | null) => ({
    root: rootSizeClass ?? "w-full h-auto",
    image: "w-auto h-auto rounded-lg shadow-md",
    previewIcon: "text-primary-500 hover:text-primary-400",
    zoomInButton: "hidden",
    zoomOutButton: "hidden",
    originalContainer: "mx-4 md:mx-auto rounded-lg shadow-lg overflow-hidden",
})
</script>

<template>
    <section id="gallery" ref="sectionRef" class="w-full mb-4">
        <div v-if="!isLoading" class="flex flex-col items-center justify-center gap-4">
            <h2 class="text-primary-800 dark:text-primary-300 font-bold text-3xl text-center">
                <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-8 h-8 inline-block mr-2 ld ld-tick" />
                {{ t('landing.gallery.title') }}
            </h2>
            <p class="py-4 text-xl text-white dark:text-white text-center">{{ t('landing.gallery.description') }}</p>
            <div class="w-full max-w-[800px] flex flex-col items-center sm:mb-4">
                <LpDemoVideo />
            </div>
            <div class="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-4 sm:gap-6 mb-4">
                <Image
                    :src="`/images/gallery-image1.webp${ver}`"
                    :alt="t('landing.gallery.image1Caption')"
                    preview
                    zoomInDisabled
                    zoomOutDisabled
                    :pt="imagePT()"
                />
                <Image
                    :src="`/images/gallery-image2.webp${ver}`"
                    :alt="t('landing.gallery.image2Caption')"
                    preview
                    zoomInDisabled
                    zoomOutDisabled
                    :pt="imagePT()"
                />
                <Image
                    :src="`/images/gallery-image3.webp${ver}`"
                    :alt="t('landing.gallery.image3Caption')"
                    preview
                    zoomInDisabled
                    zoomOutDisabled
                    :pt="imagePT()"
                />
            </div>
            <p class="text-primary-600 dark:text-primary-400 text-center mt-4">
                {{ t('landing.gallery.note') }}
            </p>
        </div>
    </section>
</template>
