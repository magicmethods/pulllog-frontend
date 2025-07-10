<script setup lang="ts">
import type { FileUploadSelectEvent, FileUploadRemoveEvent } from 'primevue/fileupload'
import { z } from 'zod'
import { useToast } from 'primevue/usetoast'
import { useUserStore } from '~/stores/useUserStore'
import { useOptionStore } from '~/stores/useOptionStore'

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

// Refs & Local variables
const internalUser = reactive<Partial<User> & { avatarFile?: File }>({
    name: userStore.user?.name ?? '',
    email: userStore.user?.email ?? '',
    password: '',
    avatarUrl: userStore.user?.avatarUrl ?? '',
    language: userStore.user?.language ?? 'ja',
    theme: userStore.user?.theme ?? 'light',
    homePage: userStore.user?.homePage ?? '/apps',
    avatarFile: undefined, // アップロード用のファイル
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

// Methods
function showToast(
    message: string,
    summary: string,
    severity: 'info' | 'success' | 'error' | 'warn' = 'success',
    life = 2500
) {
    toast.add({
        severity,
        summary,
        detail: message,
        group: 'notices',
        life,
    })
}
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

// blur 時に touched & バリデーション
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
        showToast(
            '入力内容にエラーがあります。各項目を確認してください。',
            '入力エラー',
            'warn'
        )
        return
    }

    const formData = new FormData()
    formData.append('name', internalUser.name ?? '')
    formData.append('email', internalUser.email ?? '')
    formData.append('password', internalUser.password ?? '')
    formData.append('language', internalUser.language ?? 'ja')
    formData.append('theme', internalUser.theme ?? 'light')
    formData.append('homePage', internalUser.homePage ?? '/apps')
    if (internalUser.avatarFile) {
        formData.append('avatar', internalUser.avatarFile)
    }

    isSubmitting.value = true
    try {
        // APIでの更新処理 & ストア更新
        await userStore.updateUser(formData)

        // エラーがキャッチされなければ成功
        showToast('登録情報を正常に保存しました。', '保存成功')
        // パスワードフォームは空にする
        internalUser.password = ''
        clearUploadFile()
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : '不明なエラーが発生しました'
        console.error('Error saving user settings:', e)
        showToast(errorMessage, '保存エラー', 'error', 3500)
    } finally {
        isSubmitting.value = false
    }
}

// ファイルアップロード処理
function handleFileSelect(event: FileUploadSelectEvent) {
    let file: File | undefined
    if (Array.isArray(event.files)) {
        file = event.files[0]
    } else {
        file = event.files
    }
    // ファイルが既にあれば常に置き換え
    internalUser.avatarFile = undefined
    if (file && file.size > MAX_UPLOAD_SIZE) {
        showToast(
            `アバター画像は${MAX_UPLOAD_SIZE / 1024 / 1024}MB以下のファイルをアップロードしてください。`,
            'ファイルサイズエラー',
            'error',
            3000
        )
        //if (fileUploadRef.value) fileUploadRef.value.clear()
        return
    }
    if (file) {
        internalUser.avatarFile = file
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
        internalUser.avatarFile = undefined
    }
}
function handleRemoveFile(event: FileUploadRemoveEvent) {
    //console.log('handleRemoveFile（ファイルの個別削除）:', event)
    if (internalUser.avatarFile && event.file.name === internalUser.avatarFile.name) {
        internalUser.avatarFile = undefined
    }
}
function clearUploadFile() {
    internalUser.avatarFile = undefined
}
function handleCancel() {
    navigateTo({ path: internalUser.homePage })
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

// Watchers
watch(
    () => userStore.user?.theme,
    (newTheme) => {
        if (newTheme && internalUser.theme !== newTheme) {
            internalUser.theme = newTheme
        }
    }
)
watch(
    () => userStore.user,
    (newUser) => {
        if (newUser) {
            internalUser.name = newUser.name ?? ''
            internalUser.email = newUser.email ?? ''
            internalUser.avatarUrl = newUser.avatarUrl ?? ''
            internalUser.language = newUser.language ?? 'ja'
            internalUser.theme = newUser.theme ?? 'light'
            internalUser.homePage = newUser.homePage ?? '/apps'
        }
        internalUser.avatarFile = undefined
    },
    { immediate: true, deep: true }
)

// Ad Setting
const adConfig: Record<string, AdProps> = {
    default: {
        adItems: [
            { image: '/sample/ad_9.png',  link: 'https://example.com', alt: '広告9 (728x90)' },
            { image: '/sample/ad_10.png', link: 'https://example.com', alt: '広告10 (728x90)' },
            { image: '/sample/ad_11.png', link: 'https://example.com', alt: '広告11 (728x90)' }
        ],
        adType: 'carousel',
    },
}

</script>

<template>
    <div class="w-full p-4 flex flex-col justify-between items-start">
        <CommonPageHeader
            title="登録情報変更"
            :adProps="adConfig.default"
        />
        <!-- Page Content -->
        <form class="h-max w-full m-0 p-0 flex flex-col gap-4">
            <div class="input-group-row">
                <label for="input-name" class="input-group-label md:self-start md:mt-2">表示名</label>
                <div class="input-group-control flex-col md:items-start">
                    <InputText
                        id="input-name"
                        v-model="internalUser.name"
                        placeholder="Enter your display name"
                        required
                        class="w-full md:w-80"
                        :class="{ 'p-invalid': touched.name && errors.name }"
                        @blur="handleBlur('name')"
                    />
                    <Message v-if="touched.name && errors.name" v-bind="errorMessageProps()">{{ errors.name }}</Message>
                </div>
            </div>
            <div class="input-group-row">
                <label for="input-email" class="input-group-label md:self-start md:mt-2">メールアドレス</label>
                <div class="input-group-control flex-col md:items-start">
                    <InputText
                        id="input-email"
                        v-model="internalUser.email"
                        disabled
                        class="w-full md:w-80"
                        autocomplete="username"
                    />
                    <Message severity="warn" variant="simple" size="small" class="w-full md:w-80">
                        メールアドレスは変更できません
                    </Message>
                </div>
            </div>
        <div class="input-group-row">
            <label for="input-password" class="input-group-label md:self-start md:mt-2">新規パスワード</label>
            <div class="input-group-control flex-col md:items-start">
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
                    class="w-full md:w-80"
                    :pt:pcinputtext:root="{ inputmode: 'text', autocomplete: 'current-password',
                        class: { 'p-invalid': touched.password && errors.password },
                    }"
                    @blur="handleBlur('password')"
                >
                    <template #footer>
                        <Divider :pt="{ root: 'opacity-50' }" />
                        <span class="text-sm text-surface-500 dark:text-gray-400">※ 8文字以上で入力してください</span>
                    </template>
                </Password>
                <Message v-if="touched.password && errors.password" v-bind="errorMessageProps()">{{ errors.password }}</Message>
                <Message severity="info" variant="simple" size="small" class="w-full md:w-max">
                    パスワードを<b>変更する場合のみ</b>、新しいパスワードを入力してください
                </Message>
            </div>
        </div>
        <div class="input-group-row">
            <label for="input-avatar" class="input-group-label md:self-center md:-mt-6">アバター画像</label>
            <div class="input-group-control flex-col md:items-start">
                <div class="flex items-center justify-start gap-4">
                    <div class="hidden md:block md:flex md:items-center md:justify-center md:gap-2 md:h-max md:w-max">
                        <Avatar v-bind="avatarProps()" />
                        <i class="pi pi-arrow-right text-muted"></i>
                    </div>
                    <FileUpload
                        ref="fileUploadRef"
                        name="avatar"
                        accept="image/*"
                        :maxFileSize="MAX_UPLOAD_SIZE"
                        :multiple="false"
                        chooseLabel="ファイル選択"
                        uploadLabel="アップロード"
                        cancelLabel="キャンセル　"
                        chooseIcon="pi pi-image"
                        uploadIcon="pi pi-cloud-upload"
                        :showUploadButton="false"
                        :customUpload="true"
                        @select="handleFileSelect"
                        @clear="handleClearFile"
                        @remove="handleRemoveFile"
                    >
                        <template #empty>
                            {{ uploadHelperMessage }}
                        </template>
                    </FileUpload>
                </div>
                <Message severity="info" variant="simple" size="small" class="w-full md:w-max">
                    <b>1MB以下</b>の画像ファイルをアップロードできます
                </Message>
            </div>
        </div>
        <Divider />
        <div class="input-group-row">
            <label for="language-select" class="input-group-label md:self-start md:mt-2">言語設定</label>
            <div class="input-group-control flex-col md:items-start">
                <Select
                    id="language-select"
                    v-model="internalUser.language"
                    :options="languageOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Choose Language"
                    class="w-full md:w-40"
                    :class="{ 'p-invalid': touched.language && errors.language }"
                    @blur="handleBlur('language')"
                />
                <Message v-if="touched.language && errors.language" v-bind="errorMessageProps()">{{ errors.language }}</Message>
            </div>
        </div>
        <div class="input-group-row">
            <label for="theme-select" class="input-group-label md:self-start md:mt-2">テーマ設定</label>
            <div class="input-group-control flex-col md:items-start">
                <Select
                    id="theme-select"
                    v-model="internalUser.theme"
                    :options="themeOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Switch Theme"
                    class="w-full md:w-40"
                    :class="{ 'p-invalid': touched.theme && errors.theme }"
                    @blur="handleBlur('theme')"
                />
                <Message v-if="touched.theme && errors.theme" v-bind="errorMessageProps()">{{ errors.theme }}</Message>
            </div>
        </div>
        <div class="input-group-row">
            <label for="homepage-select" class="input-group-label md:self-start md:mt-2">ホームページ</label>
            <div class="input-group-control flex-col md:items-start">
                <Select
                    id="homepage-select"
                    v-model="internalUser.homePage"
                    :options="homepageOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Choose Homepage"
                    class="w-full md:w-40"
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
        </form>
        <div class="w-full">
            <Divider />
            <div class="w-full flex justify-between items-center gap-4">
                <div class="hidden md:block md:flex-grow"></div>
                <Button label="キャンセル" class="btn btn-alt w-1/2 md:w-36" @click="handleCancel" />
                <Button
                    :label="isSubmitting ? '保存中...' : '変更を保存'"
                    class="btn btn-primary w-1/2 md:w-36"
                    :disabled="isSubmitting"
                    :loading="isSubmitting"
                    @click="handleSave"
                />
                <div class="hidden md:block md:flex-grow"></div>
            </div>
        </div>
    </div>
</template>
