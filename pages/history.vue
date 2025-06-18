<script setup lang="ts">
import { DateTime } from 'luxon'
import { z } from 'zod'
import { useToast } from 'primevue/usetoast'
import { useAppStore } from '~/stores/useAppStore'
import { useLogStore } from '~/stores/useLogStore'
import { useLoaderStore } from '~/stores/useLoaderStore'
import { getCurrencyData } from '~/utils/currency'
import { formatDate } from '~/utils/date'

// Stores
const appStore = useAppStore()
const logStore = useLogStore()
const loader = useLoaderStore()

// Plugins
const toast = useToast()

// Validation Schema
const logSchema = z.object({
  appId: z.string().min(1, 'アプリケーションを選択してください'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '無効な日付形式'),
  total_pulls: z.number().min(0),
  discharge_items: z.number().min(0),
  drop_details: z.array(z.object({
    rarity: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    symbol: z.string().nullable().optional(),
  })).optional(),
  expense: z.number().min(0),
  tags: z.array(z.string()).optional(),
  free_text: z.string().max(200).optional(),
})
const validationErrors = ref<Record<string, string[]>>({})

// State & Local variables
const calendarDraftDate = ref<CalenderDate>(null) // カレンダーの未確定日付
const targetDate = ref<CalenderDate>(null) // 確定した対象日付
const totalPullCount = ref<number>(0) // ガチャ回数
const dischargedItems = ref<number>(0) // 最高レア排出数
const dropDetails = ref<DropDetail[]>([]) // 排出内容の詳細（任意）
const expense = ref<number>(0) // 課金額
const tags = ref<string[]>([]) // タグ（任意）
const freeText = ref<string>('') // メモ（任意）
const textLength = ref<number>(0) // メモの文字数
const showCalculator = ref<boolean>(false) // 計算機モーダルの表示状態
const today = computed(() => getTodayByApp(selectedApp.value))
const todayString = computed(() => formatDate(today.value))
const maxTextLength = 200 // メモの最大文字数
const confirmModalVisible = ref<boolean>(false) // 確認モーダルの表示状態
const pendingLogData = ref<DateLog | null>(null) // 確認モーダルに渡すログデータ
const pendingValidationErrors = ref<Record<string, string[]> | null>(null) // 確認モーダルに渡すバリデーションエラー
const historyChartReloadKey = ref<number>(0) // 履歴グラフの再読み込みキー（強制更新用）
const historyStatsReloadKey = ref<number>(0) // 履歴統計の再読み込みキー（強制更新用）
const historyListReloadKey = ref<number>(0) // 履歴リストの再読み込みキー（強制更新用）

// Computed
const selectedApp = computed<AppData | null>({
  get: () => appStore.app,
  set: (val: AppData | null) => appStore.setApp(val)
})
// 通貨表示（選択アプリに依存）
const currencyUnit = computed(() => {
  if (!selectedApp.value || !selectedApp.value.currency_unit) return 'JPY' // デフォルトは JPY
  const currencyData = getCurrencyData(selectedApp.value.currency_unit)
  if (!currencyData) return selectedApp.value.currency_unit // 通貨データが見つからない場合は登録値
  return currencyData.code // or symbol_native
})

// Methods
function getTodayByApp(app: AppData | null): Date {
  // 基準: 現在日時（タイムゾーンも必要なら `const now = DateTime.now().setZone('Asia/Tokyo')` 等）
  const now = DateTime.local()
  let baseDate = now
  if (app?.sync_update_time && typeof app.date_update_time === 'string') {
    const [h, m] = app.date_update_time.split(':').map(Number)
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      // 同日0時をベースに、指定時刻で境界DateTime生成
      const boundary = now.set({ hour: h, minute: m, second: 0, millisecond: 0 })
      // 現在時刻が境界より前なら1日前
      if (now < boundary) {
        baseDate = now.minus({ days: 1 })
      }
    }
  }
  return baseDate.startOf('day').toJSDate()
}
async function handleDateCommit(date: CalenderDate): Promise<void> {
  targetDate.value = date
  console.log('handleDateCommit::', selectedApp.value, targetDate.value)
  if (!selectedApp.value || !targetDate.value) return

  // 日付のフォーマットを "YYYY-MM-DD" に変換
  const dateStr = formatDate(targetDate.value)
  if (!dateStr) return

  // ログ取得前にフォームをリセット
  resetForm()
  const loaderId = loader.show('対象日のデータを読み込み中...')
  // ログ取得
  const log = await logStore.fetchLog(selectedApp.value.appId, dateStr)
  loader.hide(loaderId)

  if (!log) {
    toast.add({ severity: 'warn', summary: 'データ未登録', detail: 'この日付の履歴は未登録です', group: 'notices', life: 2500 })
    return
  }
  // 既存のログがある場合はそれを反映
  totalPullCount.value = log.total_pulls || 0
  dischargedItems.value = log.discharge_items || 0
  dropDetails.value = log.drop_details || []
  expense.value = log.expense || 0
  tags.value = log.tags || []
  freeText.value = log.free_text || ''
  textLength.value = freeText.value.length
}
// 計算機を開く
const openCalculator = () => {
  showCalculator.value = true
}
// 計算機からの結果受取（加算）
const handleCommitAdd = (addValue: number) => {
  expense.value += addValue
  showCalculator.value = false
}
// 計算機からの結果受取（置き換え）
const handleCommitOverwrite = (newValue: number) => {
  expense.value = newValue
  showCalculator.value = false
}
// 履歴保存処理（送信用 DateLog の構築）
function submitLog() {
  if (!selectedApp.value || !targetDate.value) return

  const log: DateLog = {
    appId: selectedApp.value.appId,
    date: formatDate(targetDate.value),
    total_pulls: totalPullCount.value,
    discharge_items: dischargedItems.value,
    drop_details: [...dropDetails.value].filter(d => d.rarity || d.name || d.marker),
    expense: expense.value,
    tags: tags.value,
    free_text: freeText.value,
    images: [],
    tasks: [],
    last_updated: new Date().toISOString(),
  }

  // Zodによる検証
  const result = logSchema.safeParse(log)
  if (!result.success) {
    // 検証エラーがある場合
    validationErrors.value = result.error.flatten().fieldErrors
    pendingValidationErrors.value = result.error.flatten().fieldErrors
    pendingLogData.value = log
    confirmModalVisible.value = true
    return
  }
  // 検証成功時
  validationErrors.value = {}
  pendingValidationErrors.value = null
  pendingLogData.value = log
  confirmModalVisible.value = true
}
// 確認モーダルで「保存する」確定時
async function handleConfirmSave() {
  if (!pendingLogData.value) return
  try {
    // API送信処理
    const saved = await logStore.saveLog(pendingLogData.value)
    toast.add({
      severity: 'success',
      summary: '履歴保存完了',
      detail: `アプリ: ${selectedApp.value?.name} / 対象日: ${formatDate(targetDate.value)}`,
      group: 'notices',
      life: 3000,
    })
    // 保存成功時の処理
    //resetForm()
    //targetDate.value = null // 対象日をリセットするかは要検討
    historyChartReloadKey.value++ // 履歴グラフの再読み込みトリガー
    historyStatsReloadKey.value++ // 履歴統計の再読み込みトリガー
    historyListReloadKey.value++ // 履歴リストの再読み込みトリガー
    confirmModalVisible.value = false
  } catch (
    // biome-ignore lint:/suspicious/noExplicitAny
    error: any
  ) {
    console.error('履歴の保存に失敗:', error)
    confirmModalVisible.value = false
    toast.add({
      severity: 'error',
      summary: '履歴保存失敗',
      detail: error.message ?? '履歴の保存に失敗しました',
      group: 'notices',
      life: 4000,
    })
  }
}
// 確認モーダルで「キャンセル」 or 閉じる
function handleCloseModal() {
  confirmModalVisible.value = false
}
// リセット処理
function resetForm() {
    totalPullCount.value = 0
    dischargedItems.value = 0
    dropDetails.value = []
    expense.value = 0
    tags.value = []
    freeText.value = ''
    textLength.value = 0
    pendingLogData.value = null
}

// Lifecycle Hooks
onMounted(async () => {
  await appStore.loadApps()
})

// Watchers
watch(
  () => appStore.app,
  (newApp, prevApp) => {
    console.log('App changed:', newApp?.name, '<-', prevApp?.name)
    if (newApp) {
      calendarDraftDate.value = today.value // アプリ変更時はカレンダーの選択を today で初期化
      targetDate.value = null // 対象日もリセット
      resetForm() // フォームもリセット
      historyStatsReloadKey.value++ // 履歴統計の再読み込みトリガー
    }
  },
  { immediate: true }
)

// Styling
const inputFieldRow = 'flex flex-nowrap justify-start items-center gap-2'
const inputFieldLabel = 'font-medium block w-40 min-w-[8rem]'

</script>

<template>
  <div class="w-full p-4">
      <CommonPageHeader title="履歴登録" />

      <!-- 入力エリアとログ表示エリア -->
      <div class="w-full flex space-x-6">
          <!-- 左カラム: 入力フォーム -->
          <section class="w-2/5 min-w-[448px] space-y-6">
              <!-- アプリ選択 -->
              <SelectApps
                v-if="!appStore.isLoading"
                v-model="selectedApp"
              />

              <!-- 対象日付 -->
              <div class="flex justify-start items-center gap-4">
                <CalendarUI
                  v-model="calendarDraftDate"
                  label="対象日"
                  :commit="true"
                  commitLabel="変更"
                  :commitDisabled="selectedApp === null"
                  :defaultDate="today"
                  :maxDate="today"
                  customIcon="📅"
                  :withFooter="true"
                  :pt="{ root: 'w-80', panel: 'w-80' }"
                  containerClass="flex-1 w-64"
                  @commit="handleDateCommit"
                />
                <div class="flex-grow w-1/2 flex items-center justify-start">
                  <Message v-if="targetDate" severity="info" size="small" class="mt-6.5 p-2.5 text-base">
                    現在の登録対象日: <strong>{{ formatDate(targetDate) }}</strong>
                  </Message>
                </div>
              </div>

              <!-- 履歴の登録 -->
              <div class="space-y-2">
                  <h3>履歴の登録</h3>
                  <div :class="inputFieldRow">
                    <label for="total-pull-count" :class="inputFieldLabel">ガチャ回数</label>
                    <InputNumber
                      v-model="totalPullCount"
                      inputId="total-pull-count"
                      placeholder="ガチャ回数"
                      showButtons
                      :min="0"
                      :disabled="!targetDate"
                      class="w-44 min-w-[6rem]"
                    />
                    <Button
                      icon="pi pi-plus"
                      label="10"
                      class="btn btn-alternative p-2! text-base! m-0!"
                      @click="totalPullCount += 10"
                      :disabled="!targetDate"
                      v-blur-on-click
                    />
                    <Button
                      icon="pi pi-plus"
                      label="100"
                      class="btn btn-alternative p-2! text-base! m-0!"
                      @click="totalPullCount += 100"
                      :disabled="!targetDate"
                      v-blur-on-click
                    />
                    <Button
                      icon="pi pi-eraser"
                      label="0"
                      class="btn btn-alternative p-2! text-base! m-0!"
                      :disabled="!targetDate || totalPullCount === 0"
                      @click="totalPullCount = 0"
                      v-blur-on-click
                    />
                    <div class="w-full"></div>
                  </div>
                  <div :class="inputFieldRow">
                    <label for="discharged-items" :class="inputFieldLabel">最高レア排出数</label>
                    <InputNumber
                      v-model="dischargedItems"
                      inputId="discharged-items"
                      placeholder="最高レア排出数"
                      showButtons
                      :min="0"
                      :max="totalPullCount"
                      :disabled="totalPullCount === 0"
                      class="w-44 min-w-[6rem]"
                    />
                    <Button
                      icon="pi pi-plus"
                      label="10"
                      class="btn btn-alternative p-2! text-base! m-0!"
                      :disabled="totalPullCount < 10 || dischargedItems >= totalPullCount"
                      @click="dischargedItems += 10"
                      v-blur-on-click
                    />
                    <Button
                      icon="pi pi-plus"
                      label="100"
                      class="btn btn-alternative p-2! text-base! m-0!"
                      :disabled="totalPullCount < 100 || dischargedItems >= totalPullCount"
                      @click="dischargedItems += 100"
                      v-blur-on-click
                    />
                    <Button
                      icon="pi pi-eraser"
                      label="0"
                      class="btn btn-alternative p-2! text-base! m-0!"
                      :disabled="dischargedItems === 0"
                      @click="dischargedItems = 0"
                      v-blur-on-click
                    />
                    <div class="w-full"></div>
                  </div>
                  <div v-if="dischargedItems > 0" class="scrollable-container max-h-52 overflow-y-auto">
                    <label class="font-medium block text-md py-2 sticky top-0 z-20 bg-white dark:bg-[#070D19]">排出内容の記録（任意）</label>
                    <PullItemDetail
                      :maxEntries="dischargedItems"
                      v-model="dropDetails"
                    />
                  </div>
                  <div :class="inputFieldRow">
                    <label for="expense" :class="inputFieldLabel">課金額</label>
                    <InputNumber
                      v-model="expense"
                      inputId="expense"
                      placeholder="課金額"
                      showButtons
                      :minFractionDigits="0"
                      :maxFractionDigits="2"
                      :useGrouping="true"
                      :min="0"
                      :max="9999999"
                      :disabled="!targetDate"
                      class="w-44 min-w-[8rem]"
                    />
                    <div class="flex-grow min-w-[3rem] px-1 text-md font-medium text-surface-500 truncate">
                      {{ currencyUnit }}
                    </div>
                    <Button
                      icon="pi pi-calculator"
                      label=""
                      class="btn btn-alternative py-2! px-2.5! text-base m-0"
                      @click="openCalculator"
                      :disabled="!targetDate"
                      v-blur-on-click
                    />
                    <Button
                      icon="pi pi-eraser"
                      label="0"
                      class="btn btn-alternative p-2! text-base m-0"
                      :disabled="!targetDate || expense === 0"
                      @click="expense = 0"
                      v-blur-on-click
                    />
                    <div class="w-full"></div>
                  </div>
                  <!-- モーダル: 計算機 -->
                  <CalculatorModal
                    v-if="showCalculator"
                    :modelValue="expense"
                    @commit-add="handleCommitAdd"
                    @commit-overwrite="handleCommitOverwrite"
                    @close="showCalculator = false"
                  />
                  <div :class="inputFieldRow">
                    <label for="tags" :class="`${inputFieldLabel} pt-2`">タグ（任意）</label>
                    <InputTags
                      v-model="tags"
                      inputId="tags"
                      placeholder="タグの追加（最大%maxTags%つまで）"
                      :maxTags="3"
                      :maxLength="20"
                      class="w-full min-h-12 max-h-max"
                      :disabled="!targetDate"
                      tagPrefix="symbol"
                    />
                  </div>
                  <div :class="`${inputFieldRow} items-start! mb-4!`">
                    <label for="note" :class="`${inputFieldLabel} pt-2`">アクティビティ（任意）</label>
                    <div class="flex-grow w-full">
                      <Textarea
                        v-model="freeText"
                        inputId="note"
                        autoResize
                        :placeholder="`活動状況など（${maxTextLength}文字以内）`"
                        rows="3"
                        :maxlength="maxTextLength"
                        :disabled="!targetDate"
                        @input="textLength = freeText.length"
                        :style="{ minWidth: 'calc(100% - 10rem)' }"
                      />
                      <Message size="small" severity="secondary" variant="simple" class="text-surface dark:text-gray-500">入力文字数: {{ textLength }}</Message>
                    </div>
                  </div>
                  <div class="flex justify-between items-center gap-2">
                    <Button
                      label="入力内容をリセット"
                      class="btn btn-alternative px-3 py-2 text-center text-base"
                      @click="resetForm"
                      :disabled="!selectedApp || !targetDate"
                      v-blur-on-click
                    />
                    <Button
                      label="履歴を保存"
                      fluid
                      class="btn btn-primary px-3 py-2 text-center text-base"
                      @click="submitLog"
                      :disabled="!selectedApp || !targetDate"
                      v-blur-on-click
                    />
                  </div>
              </div>

              <!-- 広告バナー -->
              <CommonInlineAd
                :adHeight="250"
                adText="インライン広告"
              />

          </section>

          <!-- 確認モーダル -->
          <LogConfirmModal
            :visible="confirmModalVisible"
            :logData="pendingLogData"
            :validationErrors="pendingValidationErrors"
            @update:visible="confirmModalVisible = $event"
            @close="handleCloseModal"
            @confirm="handleConfirmSave"
          />

          <!-- 右カラム: 過去ログとグラフ -->
          <section class="w-3/5 mt-0 space-y-4">
              <!-- 推移グラフ -->
              <HistoryChart
                label="履歴の推移（直近）"
                :key="historyChartReloadKey"
              />

              <!-- 対象アプリの履歴統計 -->
              <HistoryStats
                :key="historyStatsReloadKey"
              />

              <!-- 履歴一覧 -->
              <HistoryList
                label="最新の履歴一覧"
                :toDate="todayString"
                :limit="7"
                :highlightDate="formatDate(targetDate)"
                :key="historyListReloadKey"
              />

          </section>
      </div>
  </div>
</template>
