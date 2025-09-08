<script setup lang="ts">
import type {
    FileUploadRemoveEvent,
    FileUploadSelectEvent,
} from "primevue/fileupload"
import { useI18n } from "vue-i18n"

// Props/Emits
const props = defineProps<{
    visible: boolean
    app?: AppData
}>()
const emit = defineEmits<{
    (e: "update:visible", value: boolean): void
    (e: "upload", value: UploadData): void
}>()

// i18n
const { t } = useI18n()

// State
const internalFile = ref<File | undefined>(undefined)
const fileUploadRef = ref(null)
const mode = ref<"overwrite" | "merge">("overwrite")
const format = ref<"json" | "csv" | undefined>(undefined)
const MAX_UPLOAD_SIZE = 1024 * 1024 // 1MB

// ファイルアップロード処理
function handleFileSelect(event: FileUploadSelectEvent) {
    let file: File | undefined
    if (Array.isArray(event.files)) {
        file = event.files[0]
    } else {
        file = event.files
    }
    // ファイルが既にあれば常に置き換え
    internalFile.value = undefined
    if (file && file.size > MAX_UPLOAD_SIZE) {
        //if (fileUploadRef.value) fileUploadRef.value.clear()
        return
    }
    if (file) {
        // ファイル形式を判定
        if (file.type === "application/json") {
            format.value = "json"
        } else if (file.type === "text/csv") {
            format.value = "csv"
        } else {
            return
        }
        internalFile.value = file
        // 1ファイルのみ受け付けるためアップローダ側も1ファイルに制限
        if (
            fileUploadRef.value &&
            Array.isArray(event.files) &&
            event.files.length > 1
        ) {
            // 先頭以外削除
            //fileUploadRef.value.files = [file]
        }
    }
}
function handleClearFile() {
    if (fileUploadRef.value) {
        //console.log('handleClearFile（キャンセルボタン押下による全ファイル削除）:', fileUploadRef.value)
        internalFile.value = undefined
    }
}
function handleRemoveFile(event: FileUploadRemoveEvent) {
    //console.log('handleRemoveFile（ファイルの個別削除）:', event)
    if (internalFile.value && event.file.name === internalFile.value.name) {
        internalFile.value = undefined
    }
}

// アップロード実行
function handleUpload() {
    if (!props.app) return

    emit("upload", {
        format: format.value,
        mode: mode.value,
        file: internalFile.value,
    } as UploadData)
    emit("update:visible", false)
}

// Watchers
watch(
    () => props.visible,
    (v) => {
        if (v) {
            // 初期化
            mode.value = "overwrite"
            format.value = undefined
        }
    },
)

// PassThrough
const fileUploadPT = {
    root: "w-full",
    content: "max-w-fit overflow-x-hidden",
    pcProgressBar: { root: "hidden" },
    file: "flex flex-wrap justify-between gap-1 max-w-[200px] mr-auto overflow-x-auto",
    fileThumbnail: "hidden",
    fileInfo: "w-full mb-0",
    fileName: "truncate",
    fileSize: "truncate",
}
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="(v: boolean) => emit('update:visible', v)"
        modal
        :header="t('modal.import.header')"
        :dismissableMask="true"
        class="w-max md:w-96"
    >
        <div class="flex flex-col gap-4">
            <p class="mb-2">
                <span>{{ t('modal.import.promptPrefix') }}</span>
                <span class="mx-1 font-bold text-amber-500 dark:text-yellow-600">{{ app?.name }}</span>
                <span>{{ t('modal.import.promptSuffix') }}</span>
            </p>

            <!-- インポート方式 -->
            <div class="mb-0">
                <label class="font-semibold">{{ t('modal.import.importMode') }}</label>
                <div class="flex flex-wrap items-center gap-6 mt-2">
                    <div class="flex items-center gap-2">
                        <RadioButton v-model="mode" inputId="mode-overwrite" name="mode" value="overwrite" />
                        <label for="mode-overwrite" class="font-medium mb-0">{{ t('modal.import.overwrite') }}</label>
                    </div>
                    <div v-if="false" class="flex items-center gap-2">
                        <RadioButton v-model="mode" inputId="mode-merge" name="mode" value="merge" disabled />
                        <label for="mode-merge" class="font-medium mb-0 text-muted">{{ t('modal.import.merge') }}</label>
                    </div>
                </div>
                <Message v-if="mode" severity="info" variant="simple" size="small" class="w-auto mt-2">
                    <template v-if="mode === 'overwrite'">
                        {{ t('modal.import.overwriteDescription') }}
                    </template>
                    <template v-else>
                        {{ t('modal.import.mergeDescription') }}
                    </template>
                </Message>
            </div>
            <!-- ファイル選択 -->
            <div class="mb-4">
                <FileUpload
                    ref="fileUploadRef"
                    name="avatar"
                    accept="application/json,text/csv"
                    :maxFileSize="MAX_UPLOAD_SIZE"
                    :multiple="false"
                    :chooseLabel="t('settings.fileUpload.chooseLabel')"
                    :uploadLabel="t('settings.fileUpload.uploadLabel')"
                    :cancelLabel="t('settings.fileUpload.cancelLabel')"
                    chooseIcon="pi pi-file-import"
                    uploadIcon="pi pi-cloud-upload"
                    :showUploadButton="false"
                    :customUpload="true"
                    :pt="fileUploadPT"
                    @select="handleFileSelect"
                    @clear="handleClearFile"
                    @remove="handleRemoveFile"
                >
                    <template #empty>
                        {{ t('settings.fileUpload.dragAndDrop') }}
                    </template>
                </FileUpload>
                <Message severity="info" variant="simple" size="small" class="w-auto mt-2">
                    <span v-html="t('modal.import.fileSizeInformation', { size: (MAX_UPLOAD_SIZE / 1024 / 1024), format1: 'CSV', format2: 'JSON' })"></span>
                </Message>
            </div>
        </div>

        <template #footer>
            <div class="w-full flex items-center justify-between gap-4">
                <Button
                    :label="t('modal.import.cancel')"
                    class="btn btn-alt w-full"
                    @click="emit('update:visible', false)"
                />
                <Button
                    :label="t('modal.import.upload')"
                    class="btn btn-primary w-full"
                    :disabled="mode === undefined || !internalFile"
                    @click="handleUpload"
                />
            </div>
        </template>
    </Dialog>
</template>
