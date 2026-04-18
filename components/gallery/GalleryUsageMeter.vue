<script setup lang="ts">
import { useI18n } from "vue-i18n"

const props = withDefaults(
    defineProps<{
        usage?: GalleryUsage | null
        loading?: boolean
    }>(),
    {
        usage: null,
        loading: false,
    },
)

const { locale, t } = useI18n()

const usagePercentage = computed<number>(() => {
    if (!props.usage || props.usage.maxBytes <= 0) return 0
    return Math.min(
        100,
        Math.max(0, (props.usage.usedBytes / props.usage.maxBytes) * 100),
    )
})

const meterToneClass = computed<string>(() => {
    if (usagePercentage.value >= 90) return "bg-red-500"
    if (usagePercentage.value >= 75) return "bg-amber-500"
    return "bg-primary-500"
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

    const formatter = new Intl.NumberFormat(locale.value, {
        maximumFractionDigits: unitIndex === 0 ? 0 : 1,
    })

    return `${formatter.format(size)} ${units[unitIndex]}`
}

function formatPercent(value: number): string {
    return new Intl.NumberFormat(locale.value, {
        maximumFractionDigits: 1,
    }).format(value)
}
</script>

<template>
    <section class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900" aria-labelledby="gallery-usage-heading">
        <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h2 id="gallery-usage-heading" class="text-base font-semibold text-surface-900 dark:text-white">
                        {{ t('gallery.usage.title') }}
                    </h2>
                    <p class="text-sm text-surface-500 dark:text-gray-400">
                        <span v-if="loading && !usage">{{ t('gallery.usage.loading') }}</span>
                        <span v-else>{{ t('gallery.usage.progress') }}: {{ formatPercent(usagePercentage) }}%</span>
                    </p>
                </div>
                <div class="text-right text-sm text-surface-500 dark:text-gray-400">
                    {{ formatPercent(usagePercentage) }}%
                </div>
            </div>

            <div
                class="h-3 overflow-hidden rounded-full bg-surface-200 dark:bg-gray-700"
                role="progressbar"
                :aria-label="t('gallery.usage.progress')"
                :aria-valuemin="0"
                :aria-valuemax="100"
                :aria-valuenow="Math.round(usagePercentage)"
            >
                <div
                    class="h-full rounded-full transition-all duration-200"
                    :class="meterToneClass"
                    :style="{ width: `${usagePercentage}%` }"
                />
            </div>

            <dl class="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div class="rounded-lg bg-surface-50 p-3 dark:bg-gray-800">
                    <dt class="text-surface-500 dark:text-gray-400">{{ t('gallery.usage.used') }}</dt>
                    <dd class="mt-1 font-semibold text-surface-900 dark:text-white">{{ formatBytes(usage?.usedBytes ?? 0) }}</dd>
                </div>
                <div class="rounded-lg bg-surface-50 p-3 dark:bg-gray-800">
                    <dt class="text-surface-500 dark:text-gray-400">{{ t('gallery.usage.limit') }}</dt>
                    <dd class="mt-1 font-semibold text-surface-900 dark:text-white">{{ formatBytes(usage?.maxBytes ?? 0) }}</dd>
                </div>
                <div class="rounded-lg bg-surface-50 p-3 dark:bg-gray-800">
                    <dt class="text-surface-500 dark:text-gray-400">{{ t('gallery.usage.remaining') }}</dt>
                    <dd class="mt-1 font-semibold text-surface-900 dark:text-white">{{ formatBytes(usage?.remainingBytes ?? 0) }}</dd>
                </div>
                <div class="rounded-lg bg-surface-50 p-3 dark:bg-gray-800">
                    <dt class="text-surface-500 dark:text-gray-400">{{ t('gallery.usage.files') }}</dt>
                    <dd class="mt-1 font-semibold text-surface-900 dark:text-white">{{ (usage?.filesCount ?? 0).toLocaleString(locale) }}</dd>
                </div>
            </dl>
        </div>
    </section>
</template>