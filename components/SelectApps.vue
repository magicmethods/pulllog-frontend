<script setup lang="ts">
import { useAppStore } from '~/stores/useAppStore'
import { useLoaderStore } from '~/stores/useLoaderStore'
import type { ToastMessageOptions } from 'primevue/toast'
import { useToast } from "primevue/usetoast"
import { useWebIcon } from '~/composables/useWebIcon'

// Stores
const appStore = useAppStore()
const loaderStore = useLoaderStore()

// Plugins
const toast = useToast()

// Composables
const { fetchWebIcon } = useWebIcon()

// Refs & Local variables
const modalVisible = ref<boolean>(false)
const editTarget = ref<AppData | undefined>(undefined)

// Computed
const selectedApp = computed<AppData | null>({
    get: () => appStore.app,
    set: (val: AppData | null) => appStore.setApp(val)
})
const registeredApps = computed<AppData[]>(() => 
    appStore.appList.filter(app => !!app && !!app.appId && !!app.name)
)
const placeholderText = computed(() => {
    return appStore.appList.length === 0 ? 'アプリを追加してください' : 'アプリを選択してください'
})
const emptyText = computed(() => {
    return appStore.appList.length === 0 ? 'アプリが登録されていません' : ''
})

// Methods
function handleChangeApp(app: AppData | null) {
    appStore.setApp(app)
}
function openModal(mode: 'edit' | 'add', e: Event) {
    const targetElm = e.target as HTMLElement
    if (targetElm?.closest('button')) {
        (targetElm.closest('button') as HTMLButtonElement).blur()
    }
    editTarget.value = undefined
    if (mode === 'edit') {
        if (!selectedApp.value) {
            e.preventDefault()
            modalVisible.value = false
            return false
        }
        // 最新内容で上書き
        const latest = registeredApps.value.find(app => app.appId === selectedApp.value?.appId)
        if (!latest) {
            toast.add({ severity: 'warn', summary: 'データ不整合', detail: '選択中のアプリがリストに見つかりません', group: 'notices', life: 3000 })
            return
        }
        editTarget.value = { ...latest }
        //console.log('openModal::handleAppEdit:', registeredApps.value, selectedApp.value, editTarget.value)
    }
    modalVisible.value = true
}
async function handleAppSubmit(app: AppData | undefined) {
    if (!app) return undefined

    let loaderId: string | undefined = undefined
    let notices: ToastMessageOptions = {}

    try {
        // API通信
        const result = await appStore.saveApp(app)
        loaderId = loaderStore.show('変更を適用中...')
        await nextTick()
        appStore.setAppById(result.appId)
        notices = { severity: 'success', summary: 'アプリケーションの保存', detail: `${result.name} を保存しました。`, group: 'notices', life: 3000 }
        //console.log('SelectApps.vue::handleAppSubmit:result:', result, registeredApps.value, selectedApp.value)
    } catch (e) {
        notices = { severity: 'error', summary: '保存エラー', detail: 'アプリの保存に失敗しました。', group: 'notices', life: 3000 }
    } finally {
        // ローダーを非表示
        if (loaderId) loaderStore.hide(loaderId)
        // 通知表示
        toast.add(notices)
        // モーダルを閉じる
        modalVisible.value = false
    }
}

// Watches

</script>

<template>
    <div>
        <h3>対象アプリケ―ション</h3>
        <div class="w-full flex flex-wrap md:flex-nowrap justify-between gap-2">
            <Select
                v-model="selectedApp"
                :options="registeredApps"
                optionLabel="name"
                :placeholder="placeholderText"
                :emptyMessage="emptyText"
                @change="handleChangeApp($event.value)"
                :pt="{ root: 'w-full md:w-1/2 h-max' }"
            >
                <template #value="slotProps">
                    <div v-if="slotProps.value" class="w-full truncate px-1 flex justify-start items-center">
                        <img
                            :src="fetchWebIcon(slotProps.value.url)"
                            :alt="slotProps.value.name"
                            class="h-6 w-6 mr-2 rounded"
                        />
                        <span>{{ slotProps.value.name }}</span>
                    </div>
                    <div v-else class="text-gray-500 select-none">{{ slotProps.placeholder }}</div>
                </template>
                <template #option="slotProps">
                    <div class="h-max w-full pl-2 flex justify-start items-center">
                        <img
                            :src="fetchWebIcon(slotProps.option.url)"
                            :alt="slotProps.option.name"
                            class="h-6 w-6 mr-2 rounded"
                        />
                        <span>{{ slotProps.option.name }}</span>
                    </div>
                </template>
            </Select>
            <div class="w-full md:w-1/2 h-max flex justify-end items-center gap-2">
                <Button
                    icon="pi pi-pen-to-square"
                    label="編集"
                    class="btn btn-alternative w-full mb-0"
                    :disabled="!selectedApp"
                    @click="openModal('edit', $event)"
                    v-blur-on-click
                />
                <Button
                    icon="pi pi-plus"
                    label="追加"
                    class="btn btn-primary w-full mb-0"
                    @click="openModal('add', $event)"
                    v-blur-on-click
                />
            </div>
        </div>
        <!-- アプリケーション設定モーダル -->
        <AppEditModal
            v-model:visible="modalVisible"
            :app="editTarget"
            @submit="handleAppSubmit"
        />
    </div>
</template>