<script setup lang="ts">
import type { MenuItem } from "primevue/menuitem"
import type { ToastMessageOptions } from "primevue/toast"
import { useToast } from "primevue/usetoast"
import { useI18n } from "vue-i18n"
import { useWebIcon } from "~/composables/useWebIcon"
import { useAppStore } from "~/stores/useAppStore"
import { useLoaderStore } from "~/stores/useLoaderStore"
import { useLogStore } from "~/stores/useLogStore"
import { useStatsStore } from "~/stores/useStatsStore"
import { useUserStore } from "~/stores/useUserStore"
import { downloadFile } from "~/utils/file"

definePageMeta({ requiresCurrency: true })

type AppStats = Map<string, Partial<StatsData>> // キーはアプリID、値は統計データの一部

// Stores
const userStore = useUserStore()
const appStore = useAppStore()
const logStore = useLogStore()
const statsStore = useStatsStore()
const loaderStore = useLoaderStore()
const toast = useToast()

// i18n
const { t } = useI18n()

// Composables
const { fetchWebIcon } = useWebIcon()

// Refs & Local State
const currentApp = computed(() => appStore.app)
const apps = computed<AppData[]>(() => appStore.appList)
const appStats = ref<AppStats>(new Map()) // アプリごとの統計データ
const configAppId = ref<string | null>(null) // 設定対象のアプリID
const modalEditVisible = ref<boolean>(false)
const deleting = ref<boolean>(false) // アプリ削除中フラグ
const modalDeleteVisible = ref<boolean>(false)
const modalDownloadVisible = ref<boolean>(false)
const modalUploadVisible = ref<boolean>(false)
const editTarget = ref<AppData | undefined>(undefined)
const maxApps = computed(() => userStore.planLimits?.maxApps ?? 5) // ユーザーが登録できる最大アプリ数
const isDemoUser = computed(() => userStore.hasUserRole("demo")) // デモユーザーかどうか
const menu = ref()
const items = computed<MenuItem[]>(() => [
    {
        label: t("apps.menu.settings"),
        items: [
            {
                label: t("apps.menu.edit"),
                icon: "pi pi-pencil",
                command: () => {
                    if (configAppId.value) {
                        editTarget.value = apps.value.find(
                            (app) => app.appId === configAppId.value,
                        )
                        if (!editTarget.value) {
                            console.error("App not found:", configAppId.value)
                            return
                        }
                        //console.log('Edit app configuration:', editTarget.value)
                        modalEditVisible.value = true
                    }
                },
            },
            {
                label: t("apps.menu.export"),
                icon: "pi pi-download",
                command: () => {
                    if (configAppId.value) {
                        editTarget.value = apps.value.find(
                            (app) => app.appId === configAppId.value,
                        )
                        if (!editTarget.value) {
                            console.error("App not found:", configAppId.value)
                            return
                        }
                        modalDownloadVisible.value = true
                    }
                },
            },
            {
                label: t("apps.menu.import"),
                icon: "pi pi-cloud-upload",
                command: () => {
                    if (configAppId.value) {
                        editTarget.value = apps.value.find(
                            (app) => app.appId === configAppId.value,
                        )
                        if (!editTarget.value) {
                            console.error("App not found:", configAppId.value)
                            return
                        }
                        modalUploadVisible.value = true
                    }
                },
            },
            { separator: true },
            {
                label: t("apps.menu.delete"),
                icon: "pi pi-trash",
                class: "p-menu-item-danger",
                command: () => {
                    if (configAppId.value) {
                        editTarget.value = apps.value.find(
                            (app) => app.appId === configAppId.value,
                        )
                        if (!editTarget.value) {
                            console.error("App not found:", configAppId.value)
                            return
                        }
                        modalDeleteVisible.value = true
                    }
                },
            },
        ],
    },
])

// Methods
const toggleMenu = (event: Event, appId: string) => {
    if (menu.value) {
        configAppId.value = appId
        menu.value.toggle(event)
    }
}
function showToast(notice: Partial<ToastMessageOptions>) {
    const defaultNotice: ToastMessageOptions = {
        severity: "info",
        summary: t("apps.notice.infoTitle"),
        detail: t("apps.notice.infoDetail"),
        group: "notices",
        life: 3000,
    }
    toast.add({ ...defaultNotice, ...notice })
}
async function loadAppStats() {
    if (apps.value.length === 0) return

    const loaderId = loaderStore.show(t("apps.loading.stats"))
    try {
        // 各アプリIDで非同期取得（ローダーなしで呼ぶ）
        const fetches = apps.value.map((app) =>
            statsStore
                .fetchStats(app.appId, "", "", undefined, false)
                .then((data) => ({ appId: app.appId, data })),
        )
        const results = await Promise.all(fetches)
        // 統計データを更新
        for (const { appId, data } of results) {
            if (data) {
                appStats.value.set(appId, data)
            } else {
                appStats.value.delete(appId) // データが取得できなかった場合は削除
            }
        }
    } finally {
        loaderStore.hide(loaderId)
    }
}
async function initialize() {
    // 初期化処理
    if (appStore.appList.length === 0) {
        await appStore.loadApps()
    }
    if (appStore.appList.length > 0) {
        await loadAppStats()
    } else {
        appStats.value.clear() // アプリがない場合は統計データをクリア
    }
}
function addNewApp() {
    editTarget.value = undefined
    modalEditVisible.value = true
}
function abortDemo() {
    // デモユーザーの場合は何もしない
    showToast({
        severity: "warn",
        summary: t("app.error.demoTitle"),
        detail: t("app.error.demoDetail"),
    })
    // モーダルを閉じる
    modalEditVisible.value = false
    modalDeleteVisible.value = false
    modalDownloadVisible.value = false
    modalUploadVisible.value = false
    return
}
// アプリケーションの登録・変更処理
async function handleAppSubmit(app: AppData | undefined) {
    if (!app) return
    if (isDemoUser.value) return abortDemo()

    let loaderId: string | undefined
    let notice: Partial<ToastMessageOptions> = {}

    try {
        // API通信
        const result = await appStore.saveApp(app)
        loaderId = loaderStore.show(t("apps.loading.saving"))
        await nextTick()
        appStore.setAppById(result.appId)
        notice = {
            severity: "success",
            summary: t("apps.notice.saveTitle"),
            detail: t("apps.notice.saveDetail", { name: result.name }),
        }
        //console.log('apps.vue::handleAppSubmit:result:', result, configAppId.value, editTarget.value)
    } catch (e) {
        notice = {
            severity: "error",
            summary: t("apps.notice.saveErrorTitle"),
            detail: t("apps.notice.saveErrorDetail"),
        }
    } finally {
        editTarget.value = undefined
        // ローダーを非表示
        if (loaderId) loaderStore.hide(loaderId)
        // 通知表示
        showToast(notice)
        // モーダルを閉じる
        modalEditVisible.value = false
    }
}
// アプリケーションの削除処理
async function handleAppDelete(app: AppData | undefined) {
    if (!app) return
    if (isDemoUser.value) return abortDemo()

    let loaderId: string | undefined
    let notice: Partial<ToastMessageOptions> = {}

    deleting.value = true
    try {
        // API通信
        await appStore.deleteApp(app.appId)
        loaderId = loaderStore.show(t("apps.loading.deleting"))

        notice = {
            severity: "success",
            summary: t("apps.notice.deleteTitle"),
            detail: t("apps.notice.deleteDetail", { name: app.name }),
        }
    } catch (e) {
        notice = {
            severity: "error",
            summary: t("apps.notice.deleteErrorTitle"),
            detail: t("apps.notice.deleteErrorDetail"),
        }
    } finally {
        editTarget.value = undefined
        // ローダーを非表示
        if (loaderId) loaderStore.hide(loaderId)
        // 通知表示
        showToast(notice)
        // モーダルを閉じる
        modalDeleteVisible.value = false
        deleting.value = false
    }
}
// 履歴ダウンロード処理
async function handleAppDownload(settings: HistoryDownloadSettings) {
    if (!editTarget.value) return
    if (isDemoUser.value) return abortDemo()

    let loaderId: string | undefined
    let notice: Partial<ToastMessageOptions> = {}
    loaderId = loaderStore.show(t("apps.loading.downloading"))

    const options = {
        fromDate: settings.dateRange.start,
        toDate: settings.dateRange.end,
    } as FetchLogsOptions
    //console.log('apps.vue::handleAppDownload:', settings, options)
    try {
        // API通信して履歴をダウンロード
        const response = await logStore.fetchLogs(
            editTarget.value.appId,
            options,
        )
        const result = downloadFile(response, settings)
        await nextTick()
        //console.log('apps.vue::handleAppDownload:result:', result)
        if (!result) {
            throw new Error(t("apps.notice.downloadErrorDetail"))
        }
        notice = {
            severity: "success",
            summary: t("apps.notice.downloadTitle"),
            detail: t("apps.notice.downloadDetail", {
                name: editTarget.value.name,
            }),
        }
    } catch (e: unknown) {
        console.error("Download Error:", e)
        notice = {
            severity: "error",
            summary: t("apps.notice.downloadErrorTitle"),
            detail: t("apps.notice.downloadErrorDetail"),
        }
    } finally {
        // ローダーを非表示
        if (loaderId) loaderStore.hide(loaderId)
        // 通知表示
        showToast(notice)
        // モーダルを閉じる
        modalDownloadVisible.value = false
    }
}
// 履歴アップロード処理
async function handleAppUpload(uploadData: UploadData) {
    if (!editTarget.value || !uploadData.format || !uploadData.file) return
    if (
        !["json", "csv"].includes(uploadData.format) ||
        uploadData.file.type.indexOf(uploadData.format) === -1
    )
        return
    if (!["overwrite", "merge"].includes(uploadData.mode)) return
    if (isDemoUser.value) return abortDemo()

    let loaderId: string | undefined
    let notice: Partial<ToastMessageOptions> = {}
    loaderId = loaderStore.show(t("apps.loading.uploading"))

    //console.log('apps.vue::handleAppUpload:', uploadData)
    try {
        // API通信して履歴をアップロード
        const result: boolean = await logStore.importLogsFile(
            editTarget.value.appId,
            uploadData,
        )
        if (!result) {
            throw new Error(t("apps.notice.importErrorDetail"))
        }
        // 履歴統計データのキャッシュクリア後、再読み込み
        statsStore.clearStatsCache(editTarget.value.appId)
        const newStats = await statsStore.fetchStats(
            editTarget.value.appId,
            "",
            "",
            undefined,
            false,
        )
        //console.log('apps.vue::handleAppUpload:result:', result, newStats)
        if (newStats) {
            appStats.value.set(editTarget.value.appId, newStats)
        } else {
            appStats.value.delete(editTarget.value.appId) // データが取得できなかった場合は削除
        }
        await nextTick()
        notice = {
            severity: "success",
            summary: t("apps.notice.importTitle"),
            detail: t("apps.notice.importDetail", {
                name: editTarget.value.name,
            }),
        }
    } catch (e: unknown) {
        console.error("Upload Error:", e)
        notice = {
            severity: "error",
            summary: t("apps.notice.importErrorTitle"),
            detail: t("apps.notice.importErrorDetail"),
        }
    } finally {
        // ローダーを非表示
        if (loaderId) loaderStore.hide(loaderId)
        // 通知表示
        showToast(notice)
        // モーダルを閉じる
        modalUploadVisible.value = false
    }
}
// 履歴登録画面へ遷移
function handleToHistory(app: AppData) {
    appStore.setApp(app)
    navigateTo({ path: "/history" })
}

// Lifecycle Hooks
onMounted(async () => {
    // Initialize app store and load apps if not already loaded
    await initialize()
    //console.log('apps.vue::onMounted:', userStore.hasUserRole('demo'), userStore.planLimits)
})

// Watchers
watch(
    () => appStore.appList,
    async () => {
        await loadAppStats()
        if (appStore.appList.length === 0) {
            appStats.value.clear() // アプリがない場合は統計データをクリア
        }
        //console.log('apps.vue::watch:appStore.appList:', apps.value, appStats.value)
    },
    { deep: true },
)

// Styles
const containerClass = (isActive: boolean) => {
    const base = "w-full border rounded-lg p-3"
    const normal = `border-surface-400 dark:border-gray-700 p-3 bg-surface-50 dark:bg-gray-800
        hover:bg-surface-50/40 dark:hover:bg-gray-700/60 hover:border-surface-500/50 dark:hover:border-gray-600/60`
    const active = `bg-primary-50 dark:bg-primary-950/40 border-primary-400 dark:border-primary-900
        hover:bg-primary-50/80 dark:hover:bg-primary-950/80 hover:border-primary-500/50 dark:hover:border-primary-800`
    return `${base} ${isActive ? active : normal}`
}

// PassThrough
const tooltipPT = {
    root: "pb-1",
    text: "w-max max-w-[20rem] p-2 bg-surface-600 text-white dark:bg-gray-800 dark:shadow-lg font-medium text-xs whitespace-nowrap break-words",
    arrow: "w-2 h-2 rotate-[45deg] border-b border-4 border-surface-600 dark:border-gray-800",
}

// Ad Setting
const adConfig: Record<string, AdProps> = {
    default: {
        adType: "none",
        //adHeight: 90,
    },
    bottom: {
        adType: "none",
        //adHeight: 90,
    },
}
</script>

<template>
    <div class="w-full h-max p-4 flex flex-col justify-between">
        <Head>
            <Title>{{ `${t('apps.header')} | ${t('app.name')}` }}</Title>
        </Head>
        <CommonPageHeader
            :title="t('apps.header')"
            :adProps="adConfig.default"
        />

        <!-- Page Content -->
        <div class="w-full mb-4">
            <p class="font-normal text-base text-surface-600 dark:text-gray-200">
                {{ t('apps.description1') }}<strong class="text-amber-500 dark:text-yellow-400 mx-0.5">{{ apps.length }}</strong>
                {{ t('apps.description2') }}<strong class="text-amber-500 dark:text-yellow-400 mx-0.5">{{ maxApps }}</strong>
                {{ t('apps.description3') }}
            </p>
            <template v-if="false"><Button v-if="apps.length < maxApps" :label="t('apps.addApp')" icon="pi pi-plus" class="btn btn-primary" @click="addNewApp" /></template>
        </div>
        <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <template v-if="apps.length">
                <div v-for="app in apps" :key="app.appId">
                    <div :class="containerClass(app.appId === currentApp?.appId)">
                        <Panel
                            :toggleable="true"
                            :collapsed="!(app.appId === currentApp?.appId)"
                            :pt="{ root: 'bg-transparent' }"
                        >
                            <template #header>
                                <div class="flex items-center gap-4">
                                    <Avatar :image="fetchWebIcon(app.url ?? '')" size="large" shape="square" :pt="{ root:'min-w-[48px] bg-transparent dark:bg-transparent rounded-lg overflow-hidden' }" />
                                    <span class="font-bold">{{ app.name }}</span>
                                </div>
                            </template>
                            <template #icons>
                                <Button
                                    icon="pi pi-cog"
                                    rounded
                                    text
                                    @click="toggleMenu($event, app.appId)"
                                    aria-haspopup="true"
                                    aria-controls="overlay_menu"
                                />
                            </template>
                            <p v-if="app.description" class="py-3 text-sm" v-html="formatText(app.description)"></p>
                            <p v-else class="py-3 text-sm text-muted">{{ t('apps.noDescription') }}</p>
                        </Panel>
                        <div class="w-full flex flex-wrap items-center justify-between gap-3 md:gap-4 mt-4 md:mt-0 -mb-2">
                            <ul class="w-full md:w-auto md:flex-grow flex flex-wrap items-center gap-4">
                                <template v-if="appStats.has(app.appId)">
                                    <li class="inline-flex items-baseline gap-1 text-muted">
                                        <i class="pi pi-calendar text-surface-400 dark:text-gray-400"></i>
                                        <span>{{ appStats.get(app.appId)?.startDate }}</span>
                                        <span class="mx-0.5 text-sm text-surface-400 dark:text-gray-400">{{ t('options.rangeSeparator') }}</span>
                                        <span>{{ appStats.get(app.appId)?.endDate }}</span>
                                    </li>
                                    <li class="inline-flex items-baseline gap-1 text-muted">
                                        <i class="pi pi-sparkles text-surface-400 dark:text-gray-400"></i>
                                        <span>{{ appStats.get(app.appId)?.totalPulls?.toLocaleString() }}</span>
                                    </li>
                                </template>
                                <li v-else class="inline-flex items-baseline gap-1 text-muted">
                                    <i class="pi pi-exclamation-circle text-surface-400 dark:text-gray-400"></i>
                                    <span>{{ t('apps.noHistory') }}</span>
                                </li>
                                <li v-if="app.url && app.url !== ''" class="hidden md:inline-flex items-baseline gap-1">
                                    <i class="pi pi-link text-surface-400 dark:text-gray-400 text-muted"></i>
                                    <a :href="app.url" target="_blank" rel="noopener noreferrer"
                                        class="text-link" v-tooltip.top="{ value: app.url, pt: tooltipPT }"
                                    >{{ t('apps.siteLink') }}</a>
                                </li>
                            </ul>
                            <div class="ml-auto w-max">
                                <Button :label="t('apps.registerHistory')" class="btn btn-alt btn-sm" @click="handleToHistory(app)" />
                            </div>
                        </div>
                    </div>
                </div>
                <Menu
                    ref="menu"
                    id="config-menu"
                    :model="items"
                    popup
                />
            </template>
            <div v-if="apps.length < maxApps">
                <div :class="[containerClass(false), 'cursor-pointer']" @click="addNewApp">
                    <Panel :pt="{ root: 'bg-transparent' }">
                        <template #header>
                            <div class="flex items-center gap-4">
                                <Avatar icon="pi pi-plus" size="large" shape="square" :pt="{ root: 'bg-surface-200 dark:bg-gray-700 text-surface-400 dark:text-gray-500!' }" />
                                <span class="font-semibold text-surface-500 dark:text-gray-400">{{ t('apps.addNew') }}</span>
                            </div>
                        </template>
                    </Panel>
                </div>
            </div>
        </div>
        <div class="mt-auto pb-2 w-full min-h-max h-[90px]">
            <CommonEmbedAd v-bind="adConfig.bottom" />
        </div>
        <!-- アプリケーション設定モーダル -->
        <AppEditModal
            v-model:visible="modalEditVisible"
            :app="editTarget"
            @submit="handleAppSubmit"
        />
        <!-- アプリケーション削除確認モーダル -->
        <AppDeleteConfirmModal
            v-model:visible="modalDeleteVisible"
            :app="editTarget"
            :loading="deleting"
            @confirm="handleAppDelete"
        />
        <!-- 履歴ダウンロードモーダル -->
        <AppDownloadModal
            v-model:visible="modalDownloadVisible"
            :app="editTarget"
            :stats="appStats.has(editTarget?.appId ?? '') ? appStats.get(editTarget?.appId ?? '') as StatsData : undefined"
            @download="handleAppDownload"
        />
        <!-- 履歴アップロードモーダル -->
        <AppUploadModal
            v-model:visible="modalUploadVisible"
            :app="editTarget"
            @upload="handleAppUpload"
        />
    </div>
</template>
