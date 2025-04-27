<script setup lang="ts">
import { useWebIcon } from '~/composables/useWebIcon'

// Props
const props = defineProps<{
    modelValue: App | null
}>()

// Emits
const emit = defineEmits<
    (e: 'update:modelValue', value: App | null) => void
>()

// Composables
const { fetchWebIcon } = useWebIcon()

// Refs & Local variables
const modalVisible = ref<boolean>(false)
const selectedApp = ref<App | null>(props.modelValue)
const editTarget = ref<App | undefined>(undefined)
const iconCache = new Map<string, string>() // キャッシュ用マップ
const registeredApps = ref<App[]>([
    { name: 'FGO', value: 'appId:fgo', url: 'https://www.fate-go.jp/' },
    { name: '原神', value: 'appId:gen', url: 'https://genshin.hoyoverse.com/ja/' },
    { name: 'モンスト', value: 'appId:mon', url: 'https://www.monster-strike.com/' },
    { name: 'グラブル', value: 'appId:gbf', url: 'https://granbluefantasy.jp/' },
    { name: 'アズールレーン', value: 'appId:azl', url: 'https://azurlane.jp/' },
    { name: 'にゃんこ大戦争', value: 'appId:cat', url: 'https://battlecats.club/' },
    { name: 'ドラクエウォーク', value: 'appId:dqw', url: 'https://www.dragonquest.jp/walk/' },
    { name: 'ツムツム', value: 'appId:dtt', url: 'https://www.disney.co.jp/games/dtt' },
    { name: 'ぷにぷに', value: 'appId:ywp', url: 'https://yokai-punipuni.jp/' },
    { name: 'ウマ娘', value: 'appId:uma', url: 'https://umamusume.jp/' },
    { name: 'メメントモリ', value: 'appId:mmm', url: 'https://mememori-game.com/' },
    { name: '無効なURLが指定されたゲーム', value: 'appId:xxx', url: 'https://invalid.social-game.net/' },
    { name: 'URL未定義のゲーム', value: 'appId:zzz', url: '' },
])

// Methods
function handleChangeApp(app: App | null) {
    selectedApp.value = app
    emit('update:modelValue', app)
}
function openModal(mode: 'edit' | 'add', e: Event) {
    const targetElm = e.target as HTMLElement
    if (targetElm?.closest('button')) {
        (targetElm.closest('button') as HTMLButtonElement).blur()
    }
    editTarget.value = undefined
    if (mode === 'edit') {
        const app = registeredApps.value.find((app: App) => app.value === selectedApp.value?.value)
        if (!app) {
            //e.preventDefault()
            modalVisible.value = false
            return false
        }
        editTarget.value = app
    }
    modalVisible.value = true
}
function handleAppSubmit(app: App | undefined) {
    if (!app) return undefined

    const index = registeredApps.value.findIndex(a => a.value === app.value)
    if (index >= 0) {
        registeredApps.value[index] = app // 編集
    } else {
        registeredApps.value.push(app) // 新規追加
    }
    modalVisible.value = false
}

// Watches
watch(
    // 親からの変更を監視
    () => props.modelValue,
    val => {
        selectedApp.value = val
    },   
    { immediate: true }
)

// Pass Through
const AppSelectionPT = {
    root: 'flex-grow border border-surface rounded bg-surface-50 dark:bg-gray-950 dark:border-gray-700 hover:ring-2 hover:ring-primary-200/50 dark:hover:ring-primary-800/40 py-2 pl-3 m-0 items-center',
    overlay: 'mt-0 border border-surface rounded shadow-lg bg-surface-50 dark:bg-gray-950 dark:border-gray-700',
    option: 'w-full py-2 px-2 flex justify-between items-center hover:text-primary-500 hover:bg-primary-200/50 dark:hover:bg-primary-700/30 dark:hover:text-primary-400',
    dropdown: 'dark:bg-gray-950 dark:border-gray-700',
    dropdownIcon: 'text-surface-400 hover:text-primary-500',
    clearIcon: 'right-9 -translate-y-1/2',
}

</script>

<template>
    <div>
        <h3 class="text-primary-600 dark:text-primary-500 mb-1 font-semibold">対象アプリケ―ション</h3>
        <div class="w-full flex justify-between gap-2">
            <Select
                v-model="selectedApp"
                :options="registeredApps"
                optionLabel="name"
                placeholder="アプリを選択してください"
                @change="handleChangeApp($event.value)"
                :pt="AppSelectionPT"
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
            <Button
                icon="pi pi-pen-to-square"
                label="編集"
                class="btn btn-alternative max-w-max px-4 py-2 mb-0! text-md!"
                :disabled="!selectedApp"
                @click="openModal('edit', $event)"
                v-blur-on-click
            />
            <Button
                icon="pi pi-plus"
                label="追加"
                class="btn btn-primary max-w-max px-4 py-2 mb-0! text-md!"
                @click="openModal('add', $event)"
                v-blur-on-click
            />
        </div>
        <!-- アプリケーション設定モーダル -->
        <AppEditModal
            v-model:visible="modalVisible"
            :app="editTarget"
            @submit="handleAppSubmit"
        />
    </div>
</template>