<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAppStore } from '~/stores/useAppStore'
import { useLogStore } from '~/stores/useLogStore'
import { useToast } from 'primevue/usetoast'
import { copySelectedText } from '~/utils/clipboard'

// Types
type HistoryListColumn = 
    'date' | 'total_pulls' | 'discharge_items' | 'drop_details' | 
    'expense' | 'tags' | 'free_text' | 'images' | 'tasks'
// Mapキーは log.date
type TagItem = {
    text: string
    html: string
}
type TagsMap = Map<string, TagItem[]>

// Props & Emits
const props = defineProps<{
    appId?: string
    label?: string
    /** 期間の開始日（YYYY-MM-DD） */
    fromDate?: string
    /** 期間の終了日（YYYY-MM-DD） */
    toDate?: string
    /** 取得件数上限 */
    limit?: number
    /** 表示する列 */
    columns?: HistoryListColumn[]
    emptyText?: string
    /** 親からデータが直接渡された場合はそれを優先 */
    logs?: DateLog[]
    /** 強調表示する日付（YYYY-MM-DD） */
    highlightDate?: string
}>()

// Stores etc.
const appStore = useAppStore()
const logStore = useLogStore()
const toast = useToast()
const { t } = useI18n()

// Refs & Local variables
const logs = ref<DateLog[]>([])
const DEFAULT_COLUMNS: HistoryListColumn[] = [
    'date', 'total_pulls', 'discharge_items', 'expense', 'tags', 'free_text'
]
const MAX_LIMIT: number = 30
const tagsMap = ref<TagsMap>(new Map())

// Computed
const internalAppId = computed(() => props.appId ?? appStore.app?.appId ?? null)
const loading = computed(() => logStore.isLoading)
//const error = computed(() => logStore.error)
const totalColumns = computed(() => (props.columns ?? DEFAULT_COLUMNS).length)
const displayEmptyText = computed(() => props.emptyText ?? t('history.historyList.empty'))
// ストアキャッシュ取得用キャッシュキー
const fetchOptions = computed(() => ({
    fromDate: props.fromDate,
    toDate: props.toDate,
    limit: props.limit && props.limit <= MAX_LIMIT ? props.limit : MAX_LIMIT
}))

// Methods
const showColumn = (col: HistoryListColumn): boolean => {
    return (props.columns ?? DEFAULT_COLUMNS).includes(col)
}
function createTagsMap(logs: DateLog[]): void {
    const map = new Map<string, TagItem[]>()
    for (const log of logs) {
        if (!log.tags || log.tags.length === 0) continue
        const tagList: TagItem[] = []
        for (const tag of log.tags) {
            const tagText = tag.trim()
            if (tagText === '') continue
            // タグ要素を生成してセット
            const tagElement = document.createElement('span')
            tagElement.className = 'tag-chips'
            tagElement.innerHTML = `<i class="pi pi-tag text-muted"></i><span class="text-antialiasing">${tagText}</span>`
            tagList.push({
                text: tagText,
                html: tagElement.outerHTML,
            })
        }
        if (tagList.length) {
            map.set(log.date, tagList)
        }
    }
    tagsMap.value = map
}
async function fetchLogs() {
    if (props.logs) {
        logs.value = [...props.logs]
        return
    }
    if (!internalAppId.value) {
        logs.value = []
        return
    }
    const targetElement = document.getElementById('HistoryListContainer') ?? undefined
    const data = await logStore.fetchLogs(internalAppId.value, fetchOptions.value, targetElement)
    if (data) {
        // 日付でソート（降順）
        data.sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime()
        })
        // タグマップを作成
        createTagsMap(data)
    }
    //console.log('HistoryList::fetchLogs::data:', data, tagsMap.value)
    logs.value = data ? [...data] : []
}
function resizeHandler() {
    // ウィンドウサイズが640px未満（Breakpoint: sm）の場合は、列の表示を調整
    if (window.innerWidth < 640) {
        const tableElm = document.querySelector<HTMLTableElement>('.list-table-container table')
        if (tableElm && logs.value.length === 0) {
            const tbody = tableElm.getElementsByTagName('tbody')[0]
            const rows = tbody.getElementsByTagName('tr')
            for (const row of rows) {
                const cells = row.getElementsByTagName('td')
                if (cells.length === 1) {
                    cells[0].setAttribute('colspan', String(totalColumns.value - 1))
                }
            }
        }
    }
}
async function handleSelectionCopy() {
    // 選択テキストがあればコピー
    const success = await copySelectedText()
    if (success) {
        toast.add({
            severity: 'success',
            summary: t('history.historyList.copyToClipboard'),
            detail: t('history.historyList.copyToClipboardSuccess'),
            group: 'notices',
            life: 2000
        })
        // ブラウザによっては選択解除してもよい（不要なら省略）
        window.getSelection()?.removeAllRanges()
    }
}

// Lifecycle hooks
onMounted(() => {
    resizeHandler()
    window.addEventListener('resize', resizeHandler)
})
onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeHandler)
})

// Watchers
watch(
    // 依存propsが変わったら取得
    [internalAppId, () => props.fromDate, () => props.toDate, () => props.limit, () => props.logs],
    () => { fetchLogs() },
    { immediate: true }
)

// PassThrough
const scrollPanelPT = {
    contentContainer: 'pr-6 text-xs whitespace-nowrap text-antialiasing',
}

</script>

<template>
    <div class="history-list">
        <h2 v-if="label" class="list-title">{{ label }}</h2>
        <div class="list-table-container overflow-x-auto">
            <table class="table-fixed">
                <thead class="bg-surface-100 dark:bg-gray-800">
                    <tr>
                        <th v-if="showColumn('date')" class="w-24">{{ t('history.historyList.date') }}</th>
                        <th v-if="showColumn('total_pulls')" class="w-14 text-center">{{ t('history.historyList.totalPulls') }}</th>
                        <th v-if="showColumn('discharge_items')" class="w-12 text-xs text-center">{{ t('history.historyList.dischargeItems') }}</th>
                        <th v-if="showColumn('expense')" class="w-20 text-center">{{ t('history.historyList.expense') }}</th>
                        <th v-if="showColumn('tags')" class="w-auto min-w-[3rem]">{{ t('history.historyList.tags') }}</th>
                        <th v-if="showColumn('free_text')" class="w-auto min-w-[6rem] hidden md:table-cell">{{ t('history.historyList.activity') }}</th>
                    </tr>
                </thead>
                <tbody id="HistoryListContainer">
                    <template v-if="loading">
                        <tr>
                            <td
                                :colspan="totalColumns"
                                class="py-4! text-center text-antialiasing"
                            >{{ t('history.historyList.loading') }}</td>
                        </tr>
                    </template>
                    <template v-else-if="logs.length > 0">
                        <tr v-for="log in logs" :key="log.date"
                            :class="{ 'bg-amber-100/66 dark:bg-amber-500/33': props.highlightDate && log.date === props.highlightDate }"
                        >
                            <td v-if="showColumn('date')">{{ log.date }}</td>
                            <td v-if="showColumn('total_pulls')" class="text-center">{{ log.total_pulls }}</td>
                            <td v-if="showColumn('discharge_items')" class="text-center">{{ log.discharge_items }}</td>
                            <td v-if="showColumn('expense')" class="text-right">{{ log.expense }}</td>
                            <td v-if="showColumn('tags')">
                                <template v-if="tagsMap.has(log.date)">
                                    <ScrollPanel
                                        style="width: 100%; height: 2rem;"
                                        :pt="scrollPanelPT"
                                    >
                                        <div
                                            class="flex flex-row flex-nowrap gap-1 select-text"
                                            @click="handleSelectionCopy"
                                        >
                                            <span
                                                v-for="tag in tagsMap.get(log.date)"
                                                :key="tag.text"
                                                v-html="tag.html"
                                            />
                                        </div>
                                    </ScrollPanel>
                                </template>
                            </td>
                            <td v-if="showColumn('free_text')" class="hidden md:table-cell">
                                <ScrollPanel v-if="log.free_text.trim() !== ''" style="width: 100%; height: 2rem;" :pt="scrollPanelPT">
                                    <span class="select-text" @click="handleSelectionCopy">
                                        {{ log.free_text }}
                                    </span>
                                </ScrollPanel>
                            </td>
                        </tr>
                    </template>
                    <template v-else>
                        <tr>
                            <td
                                :colspan="totalColumns"
                                class="empty-list"
                            ><span class="text-muted text-antialiasing">{{ displayEmptyText }}</span></td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>
