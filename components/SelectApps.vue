<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'
import { useAppStore } from '~/stores/useAppStore'
import { useLoaderStore } from '~/stores/useLoaderStore'
import { useI18n } from 'vue-i18n'
import type { ToastMessageOptions } from 'primevue/toast'
import { useToast } from "primevue/usetoast"
import { useWebIcon } from '~/composables/useWebIcon'

// Stores & Plugins
const userStore = useUserStore()
const appStore = useAppStore()
const loaderStore = useLoaderStore()
const toast = useToast()
const { t } = useI18n()

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
const isMaxApps = computed(() => {
    const maxApps = userStore.planLimits?.maxApps ?? 5
    return registeredApps.value.length >= maxApps
})
const placeholderText = computed(() => {
    return appStore.appList.length === 0 ? t('component.selectApps.addPlaceholder') : t('component.selectApps.selectPlaceholder')
})
const emptyText = computed(() => {
    return appStore.appList.length === 0 ? t('component.selectApps.emptyMessage') : ''
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
            toast.add({
                severity: 'warn',
                summary: t('component.selectApps.dataMismatch'),
                detail: t('component.selectApps.appNotFound'),
                group: 'notices',
                life: 3000
            })
            return
        }
        editTarget.value = { ...latest }
        //console.log('openModal::handleAppEdit:', registeredApps.value, selectedApp.value, editTarget.value)
    } else if (mode === 'add') {
        // 新規追加モード
        if (isMaxApps.value) {
            toast.add({
                severity: 'warn',
                summary: t('component.selectApps.maxAppsReached'),
                detail: t('component.selectApps.maxAppsReachedDetail', { max: userStore.planLimits?.maxApps ?? 5 }),
                group: 'notices',
                life: 3000
            })
            return
        }
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
        loaderId = loaderStore.show(t('component.selectApps.savingChanges'))
        await nextTick()
        appStore.setAppById(result.appId)
        notices = {
            severity: 'success',
            summary: t('component.selectApps.saveApp'),
            detail: t('component.selectApps.saveAppDetail', { name: result.name }),
            group: 'notices',
            life: 3000
        }
        //console.log('SelectApps.vue::handleAppSubmit:result:', result, registeredApps.value, selectedApp.value)
    } catch (e) {
        notices = {
            severity: 'error',
            summary: t('component.selectApps.saveError'),
            detail: t('component.selectApps.saveErrorDetail'),
            group: 'notices',
            life: 3000
        }
    } finally {
        // ローダーを非表示
        if (loaderId) loaderStore.hide(loaderId)
        // 通知表示
        toast.add(notices)
        // モーダルを閉じる
        modalVisible.value = false
    }
}

// PassThrough
const selectPT = {
    root: 'w-full md:w-1/2 h-max',
}

</script>

<template>
    <div>
        <h3>{{ t('component.selectApps.targetApps') }}</h3>
        <div class="w-full flex flex-wrap md:flex-nowrap justify-between gap-2">
            <Select
                v-model="selectedApp"
                :options="registeredApps"
                optionLabel="name"
                :placeholder="placeholderText"
                :emptyMessage="emptyText"
                @change="handleChangeApp($event.value)"
                :pt="selectPT"
            >
                <template #value="slotProps">
                    <div v-if="slotProps.value" class="w-full truncate px-1 flex justify-start items-center">
                        <img
                            :src="fetchWebIcon(slotProps.value.url)"
                            :alt="slotProps.value.name"
                            class="h-6 w-6 mr-2 rounded"
                        />
                        <span class="truncate">{{ slotProps.value.name }}</span>
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
                        <span class="truncate">{{ slotProps.option.name }}</span>
                    </div>
                </template>
            </Select>
            <div class="w-full md:w-1/2 h-max flex justify-end items-center gap-2">
                <Button
                    icon="pi pi-pen-to-square"
                    :label="t('component.selectApps.edit')"
                    class="btn btn-alternative w-full mb-0"
                    :disabled="!selectedApp"
                    @click="openModal('edit', $event)"
                    v-blur-on-click
                />
                <Button
                    icon="pi pi-plus"
                    :label="t('component.selectApps.add')"
                    class="btn btn-primary w-full mb-0"
                    @click="openModal('add', $event)"
                    :disabled="isMaxApps"
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