<script setup lang="ts">
import { useI18n } from "vue-i18n"

const props = defineProps<{
    asset: GalleryAsset
}>()

const emit = defineEmits<(e: "open", asset: GalleryAsset) => void>()

const { locale, t } = useI18n()

const previewUrl = computed<string | null>(() => {
    return (
        props.asset.thumbSmallUrl ??
        props.asset.thumbLargeUrl ??
        props.asset.publicUrl ??
        props.asset.url
    )
})

const assetUrl = computed<string | null>(() => {
    return props.asset.publicUrl ?? props.asset.url
})

const titleText = computed<string>(() => {
    return props.asset.title?.trim() || t("gallery.card.untitled")
})

const descriptionText = computed<string>(() => {
    return props.asset.description?.trim() || t("gallery.card.noDescription")
})

const visibilityText = computed<string>(() => {
    return t(`gallery.card.visibility.${props.asset.visibility}`)
})

function formatBytes(value: number): string {
    if (value <= 0) return "0 B"

    const units = ["B", "KB", "MB", "GB", "TB"]
    let size = value
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex += 1
    }

    return `${new Intl.NumberFormat(locale.value, {
        maximumFractionDigits: unitIndex === 0 ? 0 : 1,
    }).format(size)} ${units[unitIndex]}`
}

function formatDate(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return new Intl.DateTimeFormat(locale.value, {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(date)
}

function handleOpen(): void {
    emit("open", props.asset)
}
</script>

<template>
    <article class="flex h-full flex-col overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
        <button
            type="button"
            class="flex h-full flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            :aria-label="`${t('gallery.card.open')}: ${titleText}`"
            @click="handleOpen"
        >
            <div class="relative aspect-[4/3] w-full overflow-hidden bg-surface-100 dark:bg-gray-800">
                <img
                    v-if="previewUrl"
                    :src="previewUrl"
                    :alt="titleText"
                    class="h-full w-full object-cover"
                    loading="lazy"
                >
                <div v-else class="flex h-full items-center justify-center text-sm text-surface-500 dark:text-gray-400">
                    {{ t('gallery.card.noPreview') }}
                </div>
                <span class="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">
                    {{ visibilityText }}
                </span>
            </div>

            <div class="flex flex-1 flex-col gap-3 p-4">
                <div class="space-y-2">
                    <h3 class="text-base font-semibold text-surface-900 dark:text-white">
                        {{ titleText }}
                    </h3>
                    <p class="text-sm text-surface-600 dark:text-gray-300">
                        {{ descriptionText }}
                    </p>
                </div>

                <dl class="grid gap-2 text-sm text-surface-500 dark:text-gray-400">
                    <div class="flex items-center justify-between gap-3">
                        <dt>{{ t('gallery.card.createdAt') }}</dt>
                        <dd class="text-right">{{ formatDate(asset.createdAt) }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                        <dt>{{ t('gallery.card.size') }}</dt>
                        <dd class="text-right">{{ formatBytes(asset.bytes) }}</dd>
                    </div>
                </dl>
            </div>
        </button>

        <div class="border-t border-surface-200 px-4 py-3 dark:border-gray-700">
            <a
                v-if="assetUrl"
                :href="assetUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
                <i class="pi pi-external-link" aria-hidden="true" />
                <span>{{ t('gallery.card.openExternal') }}</span>
            </a>
        </div>
    </article>
</template>