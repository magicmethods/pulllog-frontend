<script setup lang="ts">
import type { FileUploadUploadEvent, FileUploadRemoveEvent } from 'primevue/fileupload'
import { z } from 'zod'
import { useToast } from 'primevue/usetoast'
import { useUserStore } from '~/stores/useUserStore'
import { useOptionStore } from '~/stores/useOptionStore'
import { endpoints } from '~/api/endpoints'

// Stores
const userStore = useUserStore()
const optionStore = useOptionStore()

// Plugins
const toast = useToast()

// Zod schema
const settingsSchema = z.object({
    name: z.string().min(1, { message: '表示名を入力してください' }).max(50, { message: '50文字以内で入力してください' }),
    password: z.string().optional().or(z.literal('')).refine(
        val => !val || val.length >= 8,
        { message: 'パスワードは8文字以上で入力してください' }
    ),
    language: z.string().min(1, { message: '言語を選択してください' }),
    theme: z.string().min(1, { message: 'テーマを選択してください' }),
    homePage: z.string().min(1, { message: 'ホームページを選択してください' }),
    // email, avatarUrlはバリデーションしない（編集不可＆外部アップロードなので）
})

// Refs & State
const home = ref<{ icon: string }>({ icon: 'pi pi-home' })
const locations = ref<Record<string, string>[]>([
    { label: '登録情報変更', value: '/settings' },
])

const internalUser = reactive<Partial<User>>({
    name: userStore.user?.name ?? '',
    email: userStore.user?.email ?? '',
    password: '',
    avatarUrl: userStore.user?.avatarUrl ?? '',
    language: userStore.user?.language ?? 'ja',
    theme: userStore.user?.theme ?? 'light',
    homePage: userStore.user?.homePage ?? '/history',
})
const errors = reactive<{ [K in keyof typeof internalUser]?: string }>({})
const touched = reactive<{ [K in keyof typeof internalUser]?: boolean }>({})
const isSubmitting = ref(false)

const languageOptions = optionStore.languageOptions
const themeOptions = optionStore.themeOptions
const homepageOptions = optionStore.homepageOptions
const fileUploadRef = ref(null)
const MAX_UPLOAD_SIZE = 1024 * 1024 // 1MB
const uploadHelperMessage = 'ファイルをここへドラッグ＆ドロップすることもできます' // Drag and drop files to here to upload.

// 単項目バリデーション
function validateField(field: keyof typeof internalUser) {
    // biome-ignore lint:/suspicious/noExplicitAny
    const singleSchema = settingsSchema.pick({ [field]: true } as any)
    const result = singleSchema.safeParse({ [field]: internalUser[field] })
    if (!result.success) {
        errors[field] = result.error.issues[0].message
    } else {
        errors[field] = undefined
    }
}

// 全体バリデーション
function validateAll(): boolean {
    const result = settingsSchema.safeParse(internalUser)
    // エラー初期化
    for (const key in errors) {
        errors[key as keyof typeof errors] = undefined
    }
    if (!result.success) {
        for (const issue of result.error.issues) {
            const key = issue.path[0] as keyof typeof internalUser
            errors[key] = issue.message
        }
        return false
    }
    return true
}

// blur時にtouched＋バリデーション
function handleBlur(field: keyof typeof internalUser) {
    touched[field] = true
    validateField(field)
}

// 保存処理
async function handleSave() {
    touched.name = true
    touched.password = true
    touched.language = true
    touched.theme = true
    touched.homePage = true
    if (!validateAll()) {
        toast.add({
            severity: 'warn',
            summary: '入力エラー',
            detail: '内容をご確認ください',
            life: 2500
        })
        return
    }
    isSubmitting.value = true
    try {
        // APIでの更新処理 & ストア更新
        await userStore.updateUser({
            name: internalUser.name,
            password: internalUser.password,
            language: internalUser.language,
            theme: internalUser.theme,
            homePage: internalUser.homePage,
            // avatarUrl, emailは除外/別途処理
        })
        // エラーがキャッチされなければ成功
        toast.add({
            severity: 'success',
            summary: '登録情報の保存',
            detail: '変更を保存しました',
            life: 2500
        })
    } catch (
        // biome-ignore lint:/suspicious/noExplicitAny
        e: any
    ) {
        console.error('Error saving user settings:', e.message ?? e)
        toast.add({
            severity: 'error',
            summary: '保存エラー',
            detail: '保存に失敗しました',
            life: 3500
        })
    } finally {
        isSubmitting.value = false
    }
}

// ファイルアップロード処理（既存通り）
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
    if (internalUser.avatarUrl) {
        return { ...avatarProps, image: internalUser.avatarUrl }
    }
    if (internalUser && internalUser.name !== '') {
        return { ...avatarProps, label: internalUser.name?.substring(0, 1).toLocaleUpperCase() }
    }
    return { ...avatarProps, icon: 'pi pi-plus' }
}
const errorMessageProps = () => {
    return {
        severity: 'error',
        size: 'small',
        variant: 'simple',
        class: 'w-max'
    }
}

</script>

<template>
    <div class="h-full w-full mx-auto px-4 pt-6 pb-2 flex flex-col justify-between items-start">
        <!-- Page Header -->
        <div id="page-header" class="flex justify-start text-sm text-surface-500 -mt-2 mb-4">
            <Breadcrumb :home="home" :model="locations" />
        </div>
        <!-- Page Content -->
        <div class="flex items-start gap-4 mb-4">
            <label for="input-name" class="w-40 mt-2">表示名</label>
            <div class="flex flex-col gap-2">
                <InputText
                    id="input-name"
                    v-model="internalUser.name"
                    placeholder="Enter your display name"
                    required
                    class="w-80"
                    :class="{ 'p-invalid': touched.name && errors.name }"
                    @blur="handleBlur('name')"
                />
                <Message v-if="touched.name && errors.name" v-bind="errorMessageProps()">{{ errors.name }}</Message>
            </div>
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
                    :pt:pcinputtext:root="{ class: { 'p-invalid': touched.password && errors.password } }"
                    @blur="handleBlur('password')"
                >
                    <template #footer>
                        <Divider :pt="{ root: 'opacity-50' }" />
                        <span class="text-sm text-surface-500 dark:text-gray-400">※ 8文字以上で入力してください</span>
                    </template>
                </Password>
                <Message v-if="touched.password && errors.password" v-bind="errorMessageProps()">{{ errors.password }}</Message>
                <Message severity="info" variant="simple" size="small" class="w-max">
                    パスワードを<b>変更する場合のみ</b>、新しいパスワードを入力してください
                </Message>
            </div>
        </div>
        <div class="flex items-start gap-4 mb-0">
            <label for="input-avatar" class="w-40 mt-11">アバター画像</label>
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
        <div class="flex items-start gap-4 mb-4">
            <label for="language-select" class="w-40 mt-2">言語設定</label>
            <div class="flex  flex-col gap-2">
                <Select
                    id="language-select"
                    v-model="internalUser.language"
                    :options="languageOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Choose Language"
                    class="w-40"
                    :class="{ 'p-invalid': touched.language && errors.language }"
                    @blur="handleBlur('language')"
                />
                <Message v-if="touched.language && errors.language" v-bind="errorMessageProps()">{{ errors.language }}</Message>
            </div>
        </div>
        <div class="flex items-start gap-4 mb-4">
            <label for="theme-select" class="w-40 mt-2">テーマ設定</label>
            <div class="flex  flex-col gap-2">
                <Select
                    id="theme-select"
                    v-model="internalUser.theme"
                    :options="themeOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Switch Theme"
                    class="w-40"
                    :class="{ 'p-invalid': touched.theme && errors.theme }"
                    @blur="handleBlur('theme')"
                />
                <Message v-if="touched.theme && errors.theme" v-bind="errorMessageProps()">{{ errors.theme }}</Message>
            </div>
        </div>
        <div class="flex items-start gap-4 mb-0">
            <label for="homepage-select" class="w-40 mt-2">ホームページ</label>
            <div class="flex flex-col gap-2">
                <Select
                    id="homepage-select"
                    v-model="internalUser.homePage"
                    :options="homepageOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Choose Homepage"
                    class="w-40"
                    :class="{ 'p-invalid': touched.homePage && errors.homePage }"
                    @blur="handleBlur('homePage')"
                />
                <Message v-if="touched.homePage && errors.homePage" v-bind="errorMessageProps()">{{ errors.homePage }}</Message>
            </div>
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
                <Button
                    label="変更を保存"
                    class="btn btn-primary"
                    :disabled="isSubmitting"
                    @click="handleSave"
                />
                <div class="flex-grow"></div>
            </div>
        </div>
    </div>
</template>
