<script setup lang="ts">
import type { FileUploadSelectEvent, FileUploadRemoveEvent } from 'primevue/fileupload'

// Props/Emits
const props = defineProps<{
    visible: boolean
    app?: AppData
}>()
const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'upload', value: UploadData): void
}>()

// State
const internalFile = ref<File | undefined>(undefined)
const fileUploadRef = ref(null)
const mode = ref<'overwrite' | 'merge'>('overwrite')
const format = ref<'json' | 'csv' | undefined>(undefined)
const MAX_UPLOAD_SIZE = 1024 * 1024 // 1MB
const uploadHelperMessage = 'ファイルをここへドラッグ＆ドロップすることもできます' // Drag and drop files to here to upload.

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
        if (file.type === 'application/json') {
            format.value = 'json'
        } else if (file.type === 'text/csv') {
            format.value = 'csv'
        } else {
            return
        }
        internalFile.value = file
        // 1ファイルのみ受け付けるためアップローダ側も1ファイルに制限
        if (fileUploadRef.value && Array.isArray(event.files) && event.files.length > 1) {
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

    emit('upload', {
        format: format.value,
        mode: mode.value,
        file: internalFile.value
    } as UploadData)
    emit('update:visible', false)
}

// Watchers
watch(
    () => props.visible,
    (v) => {
        if (v) {
            // 初期化
            mode.value = 'overwrite'
            format.value = undefined
        }
    }
)

// PassThrough
const fileUploadPT = {
    root: 'w-full',
    content: 'max-w-fit overflow-x-hidden',
    pcProgressBar: { root: 'hidden' },
    file: 'flex flex-wrap justify-between gap-1 max-w-[200px] mr-auto overflow-x-auto',
    fileThumbnail: 'hidden',
    fileInfo: 'w-full mb-0',
    fileName: 'truncate',
    fileSize: 'truncate',
}

</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="(v: boolean) => emit('update:visible', v)"
        modal
        header="インポート"
        :dismissableMask="true"
        class="w-max md:w-96"
    >
        <div class="flex flex-col gap-4">
            <p class="mb-2">
                <span>アプリ</span>
                <span class="mx-1 font-bold text-amber-500 dark:text-yellow-600">{{ app?.name }}</span>
                <span>の履歴をアップロードします。</span>
            </p>

            <!-- インポート方式 -->
            <div class="mb-0">
                <label class="font-semibold">インポート方式</label>
                <div class="flex flex-wrap items-center gap-6 mt-2">
                    <div class="flex items-center gap-2">
                        <RadioButton v-model="mode" inputId="mode-overwrite" name="mode" value="overwrite" />
                        <label for="mode-overwrite" class="font-medium mb-0">上書き</label>
                    </div>
                    <div class="flex items-center gap-2">
                        <RadioButton v-model="mode" inputId="mode-merge" name="mode" value="merge" />
                        <label for="mode-merge" class="font-medium mb-0">マージ</label>
                    </div>
                </div>
                <Message v-if="mode" severity="info" variant="simple" size="small" class="w-auto mt-2">
                    <template v-if="mode === 'overwrite'">
                        既存の履歴は全て削除され、アップロードした履歴で上書きされます
                    </template>
                    <template v-else>
                        アップロードした履歴が追加され、既存の履歴と重複するデータのみ上書きされます
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
                    chooseLabel="ファイル選択"
                    uploadLabel="アップロード"
                    cancelLabel="キャンセル　"
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
                        {{ uploadHelperMessage }}
                    </template>
                </FileUpload>
                <Message severity="info" variant="simple" size="small" class="w-auto mt-2">
                    <b>1MB以下</b>の<b>CSV</b>もしくは<b>JSON</b>形式のファイルをアップロードできます
                </Message>
            </div>
        </div>

        <template #footer>
            <div class="w-full flex items-center justify-between gap-4">
                <Button
                    label="キャンセル"
                    class="btn btn-alt w-full"
                    @click="emit('update:visible', false)"
                />
                <Button
                    label="アップロード"
                    class="btn btn-primary w-full"
                    :disabled="mode === undefined || !internalFile"
                    @click="handleUpload"
                />
            </div>
        </template>
    </Dialog>
</template>
