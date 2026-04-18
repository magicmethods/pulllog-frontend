<script setup lang="ts">
import { storeToRefs } from "pinia"
import { useToast } from "primevue/usetoast"
import { useI18n } from "vue-i18n"
import { useGalleryStore } from "~/stores/useGalleryStore"

const props = defineProps<{
    visible: boolean
    assetId?: string | null
}>()

const emit = defineEmits<(e: "update:visible", value: boolean) => void>()

const galleryStore = useGalleryStore()
const { assetMap, isLoading, isSaving } = storeToRefs(galleryStore)
const toast = useToast()
const { locale, t } = useI18n()

const title = ref("")
const description = ref("")
const visibility = ref<GalleryVisibility>("private")
const submitError = ref<string | null>(null)
const deleteConfirmationActive = ref(false)
const isDetailPending = ref(false)

let detailRequestId = 0

const visibilityOptions = computed<GalleryVisibility[]>(() => [
    "private",
    "unlisted",
    "public",
])

const asset = computed<GalleryAsset | null>(() => {
    if (!props.assetId) return null
    return assetMap.value[props.assetId] ?? null
})

const previewUrl = computed<string | null>(() => {
    return (
        asset.value?.thumbLargeUrl ??
        asset.value?.thumbSmallUrl ??
        asset.value?.publicUrl ??
        asset.value?.url ??
        null
    )
})

const assetUrl = computed<string | null>(() => {
    return asset.value?.publicUrl ?? asset.value?.url ?? null
})

const canSave = computed<boolean>(() => {
    return (
        Boolean(props.assetId) &&
        Boolean(asset.value) &&
        !isSaving.value &&
        !isDetailPending.value
    )
})

const canDelete = computed<boolean>(() => {
    return (
        Boolean(props.assetId) &&
        Boolean(asset.value) &&
        !isSaving.value &&
        !isDetailPending.value
    )
})

function syncForm(nextAsset: GalleryAsset): void {
    title.value = nextAsset.title ?? ""
    description.value = nextAsset.description ?? ""
    visibility.value = nextAsset.visibility
}

function resetState(): void {
    detailRequestId += 1
    title.value = ""
    description.value = ""
    visibility.value = "private"
    submitError.value = null
    deleteConfirmationActive.value = false
    isDetailPending.value = false
}

function closeDialog(): void {
    emit("update:visible", false)
}

function handleVisibleUpdate(value: boolean): void {
    emit("update:visible", value)
}

function trimToNullable(value: string): string | null {
    const normalized = value.trim()
    return normalized === "" ? null : normalized
}

function resolveActionErrorMessage(
    cause: unknown,
    fallbackKey: string,
): string {
    if (cause instanceof Error && cause.message.trim() !== "") {
        return cause.message
    }

    return t(fallbackKey)
}

function formatBytes(value: number | null | undefined): string {
    if (!value || value <= 0) return "0 B"

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

function formatDate(value: string | null | undefined): string {
    if (!value) return t("gallery.detail.meta.notAvailable")

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat(locale.value, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date)
}

async function loadAssetDetail(assetId: string): Promise<void> {
    const requestId = ++detailRequestId

    isDetailPending.value = true
    submitError.value = null
    deleteConfirmationActive.value = false

    if (asset.value) {
        syncForm(asset.value)
    }

    try {
        const detail = await galleryStore.fetchDetail(assetId)
        if (
            requestId !== detailRequestId ||
            !props.visible ||
            props.assetId !== assetId
        ) {
            return
        }

        syncForm(detail)
    } catch (cause: unknown) {
        if (
            requestId !== detailRequestId ||
            !props.visible ||
            props.assetId !== assetId
        ) {
            return
        }

        submitError.value = resolveActionErrorMessage(
            cause,
            "gallery.detail.error.load",
        )
    } finally {
        if (requestId === detailRequestId) {
            isDetailPending.value = false
        }
    }
}

async function handleSave(): Promise<void> {
    if (!props.assetId) {
        submitError.value = t("gallery.detail.error.assetRequired")
        return
    }

    submitError.value = null

    try {
        const updated = await galleryStore.updateAsset(props.assetId, {
            title: trimToNullable(title.value),
            description: trimToNullable(description.value),
            visibility: visibility.value,
        })

        syncForm(updated)
        toast.add({
            severity: "success",
            summary: t("gallery.toast.saveSuccessTitle"),
            detail: t("gallery.toast.saveSuccessDetail"),
            group: "notices",
            life: 3000,
        })
        closeDialog()
    } catch (cause: unknown) {
        submitError.value = resolveActionErrorMessage(
            cause,
            "gallery.detail.error.save",
        )
        toast.add({
            severity: "error",
            summary: t("gallery.toast.saveErrorTitle"),
            detail: submitError.value,
            group: "notices",
            life: 4000,
        })
    }
}

async function handleDelete(): Promise<void> {
    if (!props.assetId) {
        submitError.value = t("gallery.detail.error.assetRequired")
        return
    }

    if (!deleteConfirmationActive.value) {
        deleteConfirmationActive.value = true
        submitError.value = null
        return
    }

    submitError.value = null

    try {
        await galleryStore.deleteAsset(props.assetId)
        toast.add({
            severity: "success",
            summary: t("gallery.toast.deleteSuccessTitle"),
            detail: t("gallery.toast.deleteSuccessDetail"),
            group: "notices",
            life: 3000,
        })
        closeDialog()
    } catch (cause: unknown) {
        submitError.value = resolveActionErrorMessage(
            cause,
            "gallery.detail.error.delete",
        )
        toast.add({
            severity: "error",
            summary: t("gallery.toast.deleteErrorTitle"),
            detail: submitError.value,
            group: "notices",
            life: 4000,
        })
    }
}

watch(
    () => [props.visible, props.assetId] as const,
    ([nextVisible, nextAssetId]) => {
        if (!nextVisible) {
            resetState()
            return
        }

        if (!nextAssetId) {
            submitError.value = t("gallery.detail.error.assetRequired")
            return
        }

        void loadAssetDetail(nextAssetId)
    },
    { immediate: true },
)
</script>

<template>
    <Dialog
        :visible="visible"
        modal
        :closable="!isSaving"
        :dismissableMask="!isSaving"
        :draggable="false"
        class="w-[calc(100vw-2rem)] max-w-4xl"
        :header="t('gallery.detail.title')"
        @update:visible="handleVisibleUpdate"
    >
        <div class="flex flex-col gap-5">
            <p class="text-sm text-surface-600 dark:text-gray-300">
                {{ t('gallery.detail.description') }}
            </p>

            <Message v-if="submitError" severity="error" size="small">
                {{ submitError }}
            </Message>

            <div class="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div class="space-y-4">
                    <div class="overflow-hidden rounded-xl border border-dashed border-surface-300 bg-surface-50 dark:border-gray-700 dark:bg-gray-900/60">
                        <div class="flex aspect-[4/3] items-center justify-center bg-surface-100 dark:bg-gray-800">
                            <img
                                v-if="previewUrl"
                                :src="previewUrl"
                                :alt="title.trim() || t('gallery.card.untitled')"
                                class="h-full w-full object-cover"
                            >
                            <div v-else class="px-6 text-center text-sm text-surface-500 dark:text-gray-400">
                                {{ t('gallery.detail.previewEmpty') }}
                            </div>
                        </div>

                        <div class="grid gap-2 p-4 text-sm text-surface-600 dark:text-gray-300 sm:grid-cols-2">
                            <p>
                                <span class="font-semibold text-surface-800 dark:text-white">{{ t('gallery.detail.meta.createdAt') }}:</span>
                                <span>{{ formatDate(asset?.createdAt) }}</span>
                            </p>
                            <p>
                                <span class="font-semibold text-surface-800 dark:text-white">{{ t('gallery.detail.meta.updatedAt') }}:</span>
                                <span>{{ formatDate(asset?.updatedAt) }}</span>
                            </p>
                            <p>
                                <span class="font-semibold text-surface-800 dark:text-white">{{ t('gallery.detail.meta.size') }}:</span>
                                <span>{{ formatBytes(asset?.bytes) }}</span>
                            </p>
                            <p>
                                <span class="font-semibold text-surface-800 dark:text-white">{{ t('gallery.detail.meta.mime') }}:</span>
                                <span>{{ asset?.mime ?? t('gallery.detail.meta.notAvailable') }}</span>
                            </p>
                        </div>
                    </div>

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

                <div class="space-y-4">
                    <div v-if="isDetailPending && !asset" class="rounded-xl border border-surface-200 bg-white px-4 py-8 text-center text-sm text-surface-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                        {{ t('gallery.detail.loading') }}
                    </div>

                    <template v-else>
                        <div>
                            <label for="gallery-detail-title" class="mb-2 block text-sm font-semibold text-surface-800 dark:text-white">
                                {{ t('gallery.detail.fields.title') }}
                            </label>
                            <InputText
                                id="gallery-detail-title"
                                v-model="title"
                                fluid
                                :disabled="isSaving || isDetailPending"
                                :placeholder="t('gallery.detail.fields.titlePlaceholder')"
                            />
                        </div>

                        <div>
                            <label for="gallery-detail-description" class="mb-2 block text-sm font-semibold text-surface-800 dark:text-white">
                                {{ t('gallery.detail.fields.description') }}
                            </label>
                            <Textarea
                                id="gallery-detail-description"
                                v-model="description"
                                rows="5"
                                fluid
                                autoResize
                                :disabled="isSaving || isDetailPending"
                                :placeholder="t('gallery.detail.fields.descriptionPlaceholder')"
                            />
                        </div>

                        <div>
                            <span class="mb-2 block text-sm font-semibold text-surface-800 dark:text-white">
                                {{ t('gallery.detail.fields.visibility') }}
                            </span>
                            <div class="flex flex-wrap gap-4">
                                <div
                                    v-for="option in visibilityOptions"
                                    :key="option"
                                    class="flex items-center gap-2"
                                >
                                    <RadioButton
                                        v-model="visibility"
                                        :inputId="`gallery-detail-visibility-${option}`"
                                        name="gallery-detail-visibility"
                                        :value="option"
                                        :disabled="isSaving || isDetailPending"
                                    />
                                    <label :for="`gallery-detail-visibility-${option}`" class="text-sm text-surface-700 dark:text-gray-200">
                                        {{ t(`gallery.card.visibility.${option}`) }}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                            <div class="flex flex-col gap-3">
                                <div>
                                    <p class="text-sm font-semibold text-red-700 dark:text-red-300">
                                        {{ t('gallery.detail.delete.title') }}
                                    </p>
                                    <p class="mt-1 text-sm text-red-600 dark:text-red-200">
                                        {{ t('gallery.detail.delete.description') }}
                                    </p>
                                </div>

                                <Message v-if="deleteConfirmationActive" severity="warn" size="small">
                                    {{ t('gallery.detail.delete.confirmation') }}
                                </Message>

                                <div class="flex flex-wrap gap-3">
                                    <Button
                                        v-if="deleteConfirmationActive"
                                        outlined
                                        severity="secondary"
                                        :disabled="isSaving || isDetailPending"
                                        @click="deleteConfirmationActive = false"
                                    >
                                        {{ t('gallery.detail.delete.cancel') }}
                                    </Button>
                                    <Button
                                        severity="danger"
                                        :loading="isSaving"
                                        :disabled="!canDelete"
                                        @click="handleDelete"
                                    >
                                        {{ deleteConfirmationActive ? t('gallery.detail.delete.confirm') : t('gallery.detail.delete.action') }}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex w-full justify-between gap-3">
                <Button
                    outlined
                    severity="secondary"
                    :disabled="isSaving"
                    @click="closeDialog"
                >
                    {{ t('gallery.detail.actions.cancel') }}
                </Button>
                <Button
                    :loading="isSaving"
                    :disabled="!canSave"
                    @click="handleSave"
                >
                    {{ isSaving ? t('gallery.detail.actions.saving') : t('gallery.detail.actions.save') }}
                </Button>
            </div>
        </template>
    </Dialog>
</template>