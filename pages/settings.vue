<script setup lang="ts">
import type { FileUploadUploadEvent, FileUploadRemoveEvent } from 'primevue/fileupload'
import { useToast } from 'primevue/usetoast'
import { useUserStore } from '~/stores/useUserStore'
import { useOptionStore } from '~/stores/useOptionStore'
import { endpoints } from '~/api/endpoints'

// Stores
const userStore = useUserStore()
const optionStore = useOptionStore()

// Plugins
const toast = useToast()

// Refs & Computed
const home = ref<{ icon: string }>({ icon: 'pi pi-home' })
const locations = ref<Record<string, string>[]>([
  { label: '登録情報変更', value: '/settings' },
])
const internalUser = ref<Partial<User>>({
  name: userStore.user?.name ?? '',
  email: userStore.user?.email ?? '',
  password: '',
  avatarUrl: userStore.user?.avatarUrl ?? '',
  language: userStore.user?.language ?? 'ja',
  theme: userStore.user?.theme ?? 'light',
  homePage: userStore.user?.homePage ?? '/history',
})
const languageOptions = optionStore.languageOptions
const themeOptions = optionStore.themeOptions
const homepageOptions = optionStore.homepageOptions
const fileUploadRef = ref(null)
const MAX_UPLOAD_SIZE = 1024 * 1024 // 1MB
const uploadHelperMessage = 'ファイルをここへドラッグ＆ドロップすることもできます' // Drag and drop files to here to upload.

// Methods
function handleUploadFile(event: FileUploadUploadEvent) {
    console.log('handleUploadFile', event)
    let file: File | undefined
    if (Array.isArray(event.files)) {
        file = event.files[0]
    } else {
        file = event.files
    }
    if (file && file.size > MAX_UPLOAD_SIZE) {
        toast.add({
            severity: 'error',
            summary: 'ファイルサイズエラー',
            detail: `アバター画像は${MAX_UPLOAD_SIZE / 1024 / 1024}MB以下のファイルをアップロードしてください。`,
            life: 3000,
        })
        return
    }
    //userStore.uploadAvatar(file)
    toast.add({
        severity: 'info',
        summary: 'ファイルアップロード成功',
        detail: 'アバター画像が正常にアップロードされました。',
        life: 3000
    })
}
function handleClearFile() {
    if (fileUploadRef.value) {
        console.log('handleClearFile', fileUploadRef.value)
    }
}
function handleRemoveFile(event: FileUploadRemoveEvent) {
    console.log('handleRemoveFile', event)
}
function handleCancel() {
    navigateTo({ path: '/history' })
}
const avatarProps = () => {
    const avatarProps = {
        size: 'xlarge',
        shape: 'circle',
    }
    if (internalUser.value.avatarUrl) {
        return { ...avatarProps, image: internalUser.value.avatarUrl }
    }
    if (internalUser.value && internalUser.value.name !== '') {
        return { ...avatarProps, label: internalUser.value.name?.substring(0, 1).toLocaleUpperCase() }
    }
    return { ...avatarProps, icon: 'pi pi-plus' }
}

// Watchers

</script>

<template>
    <div class="h-full w-full mx-auto px-4 pt-6 pb-2 flex flex-col justify-between items-start">
        <!-- Page Header -->
        <div id="page-header" class="flex justify-start text-sm text-surface-500 -mt-2 mb-4">
            <Breadcrumb :home="home" :model="locations" />
        </div>
        <!-- Page Content -->
        <div class="flex items-center gap-4 mb-4">
            <label for="input-name" class="w-40">表示名</label>
            <InputText
                id="input-name"
                v-model="internalUser.name"
                placeholder="Enter your display name"
                required
                class="w-80"
            />
        </div>
        <div class="flex items-start gap-4 mb-4">
            <label for="input-email" class="w-40 mt-2">メールアドレス</label>
            <div class="flex flex-col gap-2">
                <InputText
                    id="input-email"
                    v-model="internalUser.email"
                    disabled
                    class="w-80"
                />
                <Message severity="warn" variant="simple" size="small" class="w-80">
                    メールアドレスは変更できません
                </Message>
            </div>  
        </div>
        <div class="flex items-start gap-4 mb-4">
            <label for="input-password" class="w-40 mt-2">新規パスワード</label>
            <div class="flex flex-col gap-2">
                <Password
                    id="input-password"
                    v-model="internalUser.password"
                    promptLabel="Choose a password"
                    weakLabel="Too simple"
                    mediumLabel="Average complexity"
                    strongLabel="Complex password"
                    placeholder="Enter new password"
                    toggleMask
                    :minlength="8"
                    class="w-80"
                >
                    <template #footer>
                        <Divider :pt="{ root: 'opacity-50' }" />
                        <span class="text-sm text-surface-500 dark:text-gray-400">※ 8文字以上で入力してください</span>
                    </template>
                </Password>
                <Message severity="info" variant="simple" size="small" class="w-max">
                    パスワードを<b>変更する場合のみ</b>、新しいパスワードを入力してください
                </Message>
            </div>
        </div>
        <div class="flex items-center gap-4 mb-0">
            <label for="input-avatar" class="w-40 -mt-6">アバター画像</label>
            <div class="flex flex-col gap-2">
                <div class="flex items-center justify-start gap-4">
                    <Avatar v-bind="avatarProps()" />
                    <i class="pi pi-arrow-right text-muted"></i>
                    <FileUpload
                        ref="fileUploadRef"
                        name="avatar[]"
                        :url="endpoints.user.avatar()"
                        accept="image/*"
                        :maxFileSize="MAX_UPLOAD_SIZE"
                        chooseLabel="ファイル選択"
                        uploadLabel="アップロード"
                        cancelLabel="キャンセル　"
                        chooseIcon="pi pi-image"
                        uploadIcon="pi pi-cloud-upload"
                        @upload="handleUploadFile($event)"
                        @clear="handleClearFile"
                        @remove="handleRemoveFile($event)"
                    >
                        <template #empty>
                            {{ uploadHelperMessage }}
                        </template>
                    </FileUpload>
                </div>
                <Message severity="info" variant="simple" size="small" class="w-max">
                    <b>1MB以下</b>の画像ファイルをアップロードできます
                </Message>
            </div>
        </div>
        <Divider />
        <div class="flex items-center gap-4 mb-4">
            <label for="language-select" class="w-40">言語設定</label>
            <Select
                id="language-select"
                v-model="internalUser.language"
                :options="languageOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Choose Language"
                class="w-40"
            />
        </div>
        <div class="flex items-center gap-4 mb-4">
            <label for="theme-select" class="w-40">テーマ設定</label>
            <Select
                id="theme-select"
                v-model="internalUser.theme"
                :options="themeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Switch Theme"
                class="w-40"
            />
        </div>
        <div class="flex items-center gap-4 mb-0">
            <label for="homepage-select" class="w-40">ホームページ</label>
            <Select
                id="homepage-select"
                v-model="internalUser.homePage"
                :options="homepageOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Choose Homepage"
                class="w-40"
            />
        </div>
        <div class="flex-grow w-full">
            <Divider />
            <p class="text-antialiasing mb-2">その他の設定項目</p>
        </div>
        <div class="w-full">
            <Divider />
            <div class="flex justify-center items-center gap-4">
                <div class="flex-grow"></div>
                <Button label="キャンセル" class="btn btn-alt" @click="handleCancel" />
                <Button label="変更を保存" class="btn btn-primary" @click="" />
                <div class="flex-grow"></div>
            </div>
        </div>
    </div>
</template>