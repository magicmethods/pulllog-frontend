<script setup lang="ts">
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useGalleryStore } from "~/stores/useGalleryStore"

type GalleryPeriodPreset = "7d" | "30d" | "90d" | "all"
type GalleryPeriodOption = {
    value: GalleryPeriodPreset
    label: string
}

const galleryStore = useGalleryStore()
const { assets, error, hasNextPage, isLoading, isUsageLoading, usage } =
    storeToRefs(galleryStore)
const { t } = useI18n()

const selectedPreset = ref<GalleryPeriodPreset>("all")
const loadMoreSentinel = ref<HTMLElement | null>(null)
const uploadDialogVisible = ref(false)
const detailModalVisible = ref(false)
const selectedAssetId = ref<string | null>(null)

let intersectionObserver: IntersectionObserver | null = null

const periodPresets = computed((): GalleryPeriodOption[] => [
    { value: "7d", label: t("gallery.filters.last7Days") },
    { value: "30d", label: t("gallery.filters.last30Days") },
    { value: "90d", label: t("gallery.filters.last90Days") },
    { value: "all", label: t("gallery.filters.all") },
])

function toDateString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
}

function buildPresetFilters(
    preset: GalleryPeriodPreset,
): GalleryAssetListParams {
    const base: GalleryAssetListParams = {
        page: 1,
        per: 10,
    }

    if (preset === "all") {
        return {
            ...base,
            from: undefined,
            to: undefined,
        }
    }

    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90
    const to = new Date()
    const from = new Date()
    from.setDate(to.getDate() - (days - 1))

    return {
        ...base,
        from: toDateString(from),
        to: toDateString(to),
    }
}

async function initializePage(): Promise<void> {
    await Promise.allSettled([
        galleryStore.fetchList(buildPresetFilters(selectedPreset.value)),
        galleryStore.fetchUsage(),
    ])
}

async function applyPreset(preset: GalleryPeriodPreset): Promise<void> {
    if (selectedPreset.value === preset && assets.value.length > 0) return

    selectedPreset.value = preset
    await galleryStore.fetchList(buildPresetFilters(preset))
}

async function loadMore(): Promise<void> {
    if (isLoading.value || !hasNextPage.value) return
    await galleryStore.fetchNextPage()
}

function openUploadDialog(): void {
    uploadDialogVisible.value = true
}

function handleOpenAsset(asset: GalleryAsset): void {
    galleryStore.selectAsset(asset.id)
    selectedAssetId.value = asset.id
    detailModalVisible.value = true
}

function handleDetailModalVisibility(nextVisible: boolean): void {
    detailModalVisible.value = nextVisible

    if (nextVisible) {
        return
    }

    selectedAssetId.value = null
    galleryStore.selectAsset(null)
}

function attachIntersectionObserver(): void {
    if (!process.client || !loadMoreSentinel.value || intersectionObserver)
        return

    intersectionObserver = new IntersectionObserver(
        (entries) => {
            const target = entries[0]
            if (!target?.isIntersecting) return
            void loadMore()
        },
        {
            rootMargin: "160px 0px",
        },
    )

    intersectionObserver.observe(loadMoreSentinel.value)
}

function detachIntersectionObserver(): void {
    if (!intersectionObserver) return
    intersectionObserver.disconnect()
    intersectionObserver = null
}

watch(loadMoreSentinel, () => {
    detachIntersectionObserver()
    attachIntersectionObserver()
})

onMounted(() => {
    void initializePage()
    attachIntersectionObserver()
})

onBeforeUnmount(() => {
    detachIntersectionObserver()
})
</script>

<template>
    <div class="w-full h-max p-4 flex flex-col justify-between">
        <Head>
            <Title>{{ `${t('gallery.header')} | ${t('app.name')}` }}</Title>
        </Head>

        <CommonPageHeader :title="t('gallery.header')" />

        <div class="w-full space-y-4">
            <p class="text-base text-surface-600 dark:text-gray-200">
                {{ t('gallery.description') }}
            </p>

            <section class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900" :aria-label="t('gallery.filters.period')">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-medium text-surface-600 dark:text-gray-300">{{ t('gallery.filters.period') }}</span>
                        <Button
                            v-for="preset in periodPresets"
                            :key="preset.value"
                            :label="preset.label"
                            :outlined="selectedPreset !== preset.value"
                            :severity="selectedPreset === preset.value ? 'primary' : 'secondary'"
                            size="small"
                            @click="applyPreset(preset.value)"
                        />
                    </div>

                    <Button
                        :label="t('gallery.actions.upload')"
                        icon="pi pi-cloud-upload"
                        @click="openUploadDialog"
                    />
                </div>
            </section>

            <GalleryUsageMeter :usage="usage" :loading="isUsageLoading" />

            <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {{ error }}
            </div>

            <div v-if="isLoading && !assets.length" class="rounded-xl border border-surface-200 bg-white px-4 py-10 text-center text-sm text-surface-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                {{ t('gallery.loading') }}
            </div>

            <div v-else-if="!assets.length" class="rounded-xl border border-dashed border-surface-300 bg-surface-50 px-4 py-10 text-center text-sm text-surface-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
                {{ t('gallery.empty') }}
            </div>

            <section v-else class="space-y-4">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <GalleryAssetCard
                        v-for="asset in assets"
                        :key="asset.id"
                        :asset="asset"
                        @open="handleOpenAsset"
                    />
                </div>

                <div v-if="hasNextPage" class="flex flex-col items-center gap-3 pb-4">
                    <Button
                        :label="isLoading ? t('gallery.loadingMore') : t('gallery.loadMore')"
                        :loading="isLoading"
                        outlined
                        @click="loadMore"
                    />
                    <div ref="loadMoreSentinel" class="h-1 w-full" aria-hidden="true" />
                </div>
            </section>
        </div>

        <GalleryUploadDialog v-model:visible="uploadDialogVisible" />
        <GalleryAssetDetailModal
            :visible="detailModalVisible"
            :asset-id="selectedAssetId"
            @update:visible="handleDetailModalVisibility"
        />
    </div>
</template>