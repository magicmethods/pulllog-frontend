<script setup lang="ts">
import { DateTime } from 'luxon'

// Props/Emits
const props = defineProps<{
    visible: boolean
    app?: AppData
    stats?: StatsData
}>()
const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'download', value: HistoryDownloadSettings): void
}>()

// State
const mode = ref<'all' | 'range'>('all')
const startDate = ref<CalenderDate>(null)
const endDate = ref<CalenderDate>(null)
const format = ref<'json' | 'csv'>('json')

// 型ガード
const isValidDate = (d: unknown): d is string | Date =>
    typeof d === 'string' || d instanceof Date
// 日付範囲のバリデーション
const isDateRangeValid = computed(() =>
    mode.value === 'all' ||
    (
        isValidDate(startDate.value) &&
        isValidDate(endDate.value) &&
        DateTime.fromJSDate(new Date(startDate.value)).startOf('day') <=
        DateTime.fromJSDate(new Date(endDate.value)).startOf('day')
    )
)
// ダウンロード実行
function handleDownload() {
    if (!props.app) return
    if (mode.value === 'range' && !isDateRangeValid.value) return

    // 日付をYYYY-MM-DD形式に変換
    const startYmd = mode.value === 'range' && isValidDate(startDate.value)
        ? DateTime.fromJSDate(new Date(startDate.value)).toFormat('yyyy-MM-dd')
        : ''
    const endYmd = mode.value === 'range' && isValidDate(endDate.value)
        ? DateTime.fromJSDate(new Date(endDate.value)).toFormat('yyyy-MM-dd')
        : ''
    emit('download', {
        format: format.value,
        includeImages: false,
        dateRange: {
            start: startYmd ?? '',
            end: endYmd ?? '',
        }
    } as HistoryDownloadSettings)
    emit('update:visible', false)
}

// Watchers
watch(
    () => props.visible,
    (v) => {
        if (v) {
            // 初期化
            mode.value = 'all'
            startDate.value = null
            endDate.value = null
            format.value = 'json'
        }
    }
)

</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="(v) => emit('update:visible', v)"
        modal
        header="エクスポート"
        :dismissableMask="true"
        class="w-max md:w-96"
    >
        <div class="flex flex-col gap-4">
            <p class="mb-2">
                <span>アプリ</span>
                <span class="mx-1 font-bold text-amber-500 dark:text-yellow-600">{{ app?.name }}</span>
                <span>の履歴をダウンロードします。</span>
            </p>

            <!-- 期間選択 -->
            <div>
                <label class="font-semibold">期間指定</label>
                <div class="flex flex-wrap items-center gap-6 mt-2">
                    <div class="flex items-center gap-2">
                        <RadioButton v-model="mode" inputId="mode-all" name="mode" value="all" />
                        <label for="mode-all" class="font-medium mb-0">全期間</label>
                    </div>
                    <div class="flex items-center gap-2">
                        <RadioButton v-model="mode" inputId="mode-range" name="mode" value="range" />
                        <label for="mode-range" class="font-medium mb-0">日付を指定</label>
                    </div>
                </div>
                <div v-if="mode === 'range'" class="flex flex-wrap gap-2 mt-4">
                    <CalendarUI
                        v-model="startDate"
                        placeholder="開始日"
                        :minDate="stats?.startDate ? (typeof stats.startDate === 'string' ? new Date(stats.startDate) : stats.startDate) as Date : undefined"
                        :maxDate="endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) as Date : undefined"
                        :pt="{ root: 'flex-grow w-max md:w-max', panel: 'w-[calc(100%_-_20px)] md:w-80' }"
                        containerClass="w-40"
                        :withFooter="true"
                        :commit="false"
                    />
                    <span class="self-center">〜</span>
                    <CalendarUI
                        v-model="endDate"
                        placeholder="終了日"
                        :minDate="startDate ? (typeof startDate === 'string' ? new Date(startDate) : startDate) as Date : undefined"
                        :maxDate="stats?.endDate ? (typeof stats.endDate === 'string' ? new Date(stats.endDate) : stats.endDate) as Date : undefined"
                        :pt="{ root: 'flex-grow w-max md:w-max', panel: 'w-[calc(100%_-_20px)] md:w-80' }"
                        containerClass="w-40"
                        :withFooter="true"
                        :commit="false"
                    />
                </div>
                <Message v-if="mode === 'range' && !!startDate && !!endDate && !isDateRangeValid" severity="error" size="small" variant="simple" class="mt-1">
                    開始日と終了日が正しく指定されていません
                </Message>
            </div>

            <!-- ファイル形式選択 -->
            <div class="mb-4">
                <label class="font-semibold">ファイル形式</label>
                <div class="flex flex-wrap items-center gap-6 mt-2">
                    <div class="flex items-center gap-2">
                        <RadioButton v-model="format" inputId="format-json" name="format" value="json" />
                        <label for="format-json" class="font-medium mb-0">JSON</label>
                    </div>
                    <div class="flex items-center gap-2">
                        <RadioButton v-model="format" inputId="format-csv" name="format" value="csv" />
                        <label for="format-csv" class="font-medium mb-0">CSV</label>
                    </div>
                </div>
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
                    label="ダウンロード"
                    class="btn btn-primary w-full"
                    :disabled="mode === 'range' && !isDateRangeValid"
                    @click="handleDownload"
                />
            </div>
        </template>
    </Dialog>
</template>
