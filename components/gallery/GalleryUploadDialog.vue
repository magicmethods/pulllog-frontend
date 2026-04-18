<script setup lang="ts">
import { storeToRefs } from "pinia"
import type {
    FileUploadRemoveEvent,
    FileUploadSelectEvent,
} from "primevue/fileupload"
import { useToast } from "primevue/usetoast"
import { useGalleryStore } from "~/stores/useGalleryStore"
import { ApiError } from "~/utils/error"

const props = defineProps<{
    visible: boolean
}>()

const emit = defineEmits<(e: "update:visible", value: boolean) => void>()

const galleryStore = useGalleryStore()
const { isUploading } = storeToRefs(galleryStore)
const toast = useToast()
const { t } = useI18n()

const fileUploadRef = ref()
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const title = ref("")
const description = ref("")
const visibility = ref<GalleryVisibility>("private")
const submitError = ref<string | null>(null)

const visibilityOptions = computed<GalleryVisibility[]>(() => [
    "private",
    "unlisted",
    "public",
])

const canSubmit = computed<boolean>(() => {
    return selectedFile.value !== null && !isUploading.value
})

function updatePreview(file: File | null): void {
    if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
        previewUrl.value = null
    }

    if (!file) return
    previewUrl.value = URL.createObjectURL(file)
}

function resetForm(): void {
    selectedFile.value = null
    updatePreview(null)
    title.value = ""
    description.value = ""
    visibility.value = "private"
    submitError.value = null

    if (fileUploadRef.value) {
        fileUploadRef.value.clear()
    }
}

function closeDialog(): void {
    emit("update:visible", false)
}

function handleVisibleUpdate(value: boolean): void {
    emit("update:visible", value)
}

function normalizeSelectedFile(event: FileUploadSelectEvent): File | null {
    if (Array.isArray(event.files)) {
        return event.files[0] ?? null
    }
    return event.files ?? null
}

function handleFileSelect(event: FileUploadSelectEvent): void {
    submitError.value = null
    const nextFile = normalizeSelectedFile(event)

    if (!nextFile) {
        selectedFile.value = null
        updatePreview(null)
        return
    }

    if (!nextFile.type.startsWith("image/")) {
        selectedFile.value = null
        updatePreview(null)
        submitError.value = t("gallery.upload.error.imageOnly")
        toast.add({
            severity: "error",
            summary: t("gallery.toast.uploadErrorTitle"),
            detail: submitError.value,
            group: "notices",
            life: 4000,
        })
        if (fileUploadRef.value) {
            fileUploadRef.value.clear()
        }
        return
    }

    selectedFile.value = nextFile
    updatePreview(nextFile)
}

function handleClearFile(): void {
    selectedFile.value = null
    updatePreview(null)
    submitError.value = null
}

function handleRemoveFile(event: FileUploadRemoveEvent): void {
    if (selectedFile.value?.name === event.file.name) {
        selectedFile.value = null
        updatePreview(null)
    }
    submitError.value = null
}

function trimToNullable(value: string): string | null {
    const normalized = value.trim()
    return normalized === "" ? null : normalized
}

function resolveUploadErrorMessage(cause: unknown): string {
    if (cause instanceof ApiError) {
        if (cause.status === 409) return t("gallery.upload.error.conflict")
        if (cause.status === 403) return t("gallery.upload.error.forbidden")
        if (cause.status === 422) return t("gallery.upload.error.validation")
        return cause.message || t("gallery.upload.error.generic")
    }

    if (cause instanceof Error && cause.message.trim() !== "") {
        return cause.message
    }

    return t("gallery.upload.error.generic")
}

async function submitUpload(): Promise<void> {
    if (!selectedFile.value) {
        submitError.value = t("gallery.upload.error.fileRequired")
        return
    }

    submitError.value = null

    try {
        await galleryStore.uploadAsset({
            file: selectedFile.value,
            fileName: selectedFile.value.name,
            title: trimToNullable(title.value),
            description: trimToNullable(description.value),
            visibility: visibility.value,
        })

        toast.add({
            severity: "success",
            summary: t("gallery.toast.uploadSuccessTitle"),
            detail: t("gallery.toast.uploadSuccessDetail"),
            group: "notices",
            life: 3000,
        })

        resetForm()
        closeDialog()
    } catch (cause: unknown) {
        submitError.value = resolveUploadErrorMessage(cause)
        toast.add({
            severity: "error",
            summary: t("gallery.toast.uploadErrorTitle"),
            detail: submitError.value,
            group: "notices",
            life: 4000,
        })
    }
}

watch(
    () => props.visible,
    (nextVisible) => {
        if (nextVisible) {
            submitError.value = null
            return
        }
        resetForm()
    },
)

onBeforeUnmount(() => {
    updatePreview(null)
})

const fileUploadPT = {
    root: "w-full",
    content: "max-w-full overflow-x-hidden",
    pcProgressBar: { root: "hidden" },
    file: "flex flex-wrap justify-between gap-1 max-w-full mr-auto overflow-x-auto",
    fileThumbnail: "hidden",
    fileInfo: "w-full mb-0",
    fileName: "truncate",
    fileSize: "truncate",
}
</script>

<template>
    <Dialog
        :visible="visible"
        modal
        :dismissableMask="!isUploading"
        :draggable="false"
        class="w-[calc(100vw-2rem)] max-w-2xl"
        :header="t('gallery.upload.title')"
        @update:visible="handleVisibleUpdate"
    >
        <div class="flex flex-col gap-5">
            <p class="text-sm text-surface-600 dark:text-gray-300">
                {{ t('gallery.upload.description') }}
            </p>

            <div class="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div class="space-y-4">
                    <div>
                        <label class="mb-2 block text-sm font-semibold text-surface-800 dark:text-white">
                            {{ t('gallery.upload.fileLabel') }}
                        </label>
                        <FileUpload
                            ref="fileUploadRef"
                            name="gallery-upload"
                            accept="image/*"
                            :multiple="false"
                            :showUploadButton="false"
                            :customUpload="true"
                            :chooseLabel="t('gallery.upload.chooseFile')"
                            :cancelLabel="t('settings.fileUpload.cancelLabel')"
                            chooseIcon="pi pi-images"
                            :pt="fileUploadPT"
                            @select="handleFileSelect"
                            @clear="handleClearFile"
                            @remove="handleRemoveFile"
                        >
                            <template #empty>
                                <div class="space-y-1 py-4 text-center text-sm text-surface-500 dark:text-gray-400">
                                    <p>{{ t('gallery.upload.dropzone') }}</p>
                                    <p>{{ t('gallery.upload.imageOnlyHint') }}</p>
                                </div>
                            </template>
                        </FileUpload>
                    </div>

                    <div>
                        <label for="gallery-upload-title" class="mb-2 block text-sm font-semibold text-surface-800 dark:text-white">
                            {{ t('gallery.upload.fields.title') }}
                        </label>
                        <InputText
                            id="gallery-upload-title"
                            v-model="title"
                            fluid
                            :placeholder="t('gallery.upload.fields.titlePlaceholder')"
                        />
                    </div>

                    <div>
                        <label for="gallery-upload-description" class="mb-2 block text-sm font-semibold text-surface-800 dark:text-white">
                            {{ t('gallery.upload.fields.description') }}
                        </label>
                        <Textarea
                            id="gallery-upload-description"
                            v-model="description"
                            rows="4"
                            fluid
                            autoResize
                            :placeholder="t('gallery.upload.fields.descriptionPlaceholder')"
                        />
                    </div>

                    <div>
                        <span class="mb-2 block text-sm font-semibold text-surface-800 dark:text-white">
                            {{ t('gallery.upload.fields.visibility') }}
                        </span>
                        <div class="flex flex-wrap gap-4">
                            <div
                                v-for="option in visibilityOptions"
                                :key="option"
                                class="flex items-center gap-2"
                            >
                                <RadioButton
                                    v-model="visibility"
                                    :inputId="`gallery-visibility-${option}`"
                                    name="gallery-visibility"
                                    :value="option"
                                />
                                <label :for="`gallery-visibility-${option}`" class="text-sm text-surface-700 dark:text-gray-200">
                                    {{ t(`gallery.card.visibility.${option}`) }}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="overflow-hidden rounded-xl border border-dashed border-surface-300 bg-surface-50 dark:border-gray-700 dark:bg-gray-900/60">
                        <div class="flex aspect-[4/3] items-center justify-center bg-surface-100 dark:bg-gray-800">
                            <img
                                v-if="previewUrl"
                                :src="previewUrl"
                                :alt="title.trim() || t('gallery.upload.previewAlt')"
                                class="h-full w-full object-cover"
                            >
                            <div v-else class="px-6 text-center text-sm text-surface-500 dark:text-gray-400">
                                {{ t('gallery.upload.previewEmpty') }}
                            </div>
                        </div>
                        <div class="space-y-2 p-4 text-sm text-surface-600 dark:text-gray-300">
                            <p>
                                <span class="font-semibold text-surface-800 dark:text-white">{{ t('gallery.upload.selectedFile') }}:</span>
                                <span>{{ selectedFile?.name ?? t('gallery.upload.notSelected') }}</span>
                            </p>
                            <p>{{ t('gallery.upload.initialScopeNote') }}</p>
                        </div>
                    </div>

                    <Message v-if="submitError" severity="error" class="w-full">
                        {{ submitError }}
                    </Message>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                    :label="t('gallery.upload.cancel')"
                    text
                    :disabled="isUploading"
                    @click="closeDialog"
                />
                <Button
                    :label="isUploading ? t('gallery.upload.uploading') : t('gallery.upload.submit')"
                    icon="pi pi-cloud-upload"
                    :loading="isUploading"
                    :disabled="!canSubmit"
                    @click="submitUpload"
                />
            </div>
        </template>
    </Dialog>
</template>