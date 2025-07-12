<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { DateTime } from 'luxon'
import { z } from 'zod'
import { useToast } from 'primevue/usetoast'
import { useUserStore } from '~/stores/useUserStore'
import { useAppStore } from '~/stores/useAppStore'
import { useLogStore } from '~/stores/useLogStore'
import { useLoaderStore } from '~/stores/useLoaderStore'
import { getCurrencyData } from '~/utils/currency'
import { formatDate } from '~/utils/date'

// Stores & Plugins
const userStore = useUserStore()
const appStore = useAppStore()
const logStore = useLogStore()
const loader = useLoaderStore()
const toast = useToast()
const { t } = useI18n()

// Validation Schema
const logSchema = computed(() => z.object({
  appId: z.string().min(1, t('validation.selectedAppEmpty')),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.invalidDate')),
  total_pulls: z.number().min(0),
  discharge_items: z.number().min(0),
  drop_details: z.array(z.object({
    rarity: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    symbol: z.string().nullable().optional(),
  })).optional(),
  expense: z.number().min(0),
  tags: z.array(z.string()).optional(),
  free_text: z.string().max(userStore.planLimits?.maxLogTextLength ?? 250).optional(),
}))
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
const maxTextLength = computed(() => userStore.planLimits?.maxLogTextLength ?? 250) // メモの最大文字数
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
  //console.log('handleDateCommit::', selectedApp.value, targetDate.value)
  if (!selectedApp.value || !targetDate.value) return

  // 日付のフォーマットを "YYYY-MM-DD" に変換
  const dateStr = formatDate(targetDate.value)
  if (!dateStr) return

  // ログ取得前にフォームをリセット
  resetForm()
  const loaderId = loader.show(t('history.loadingLogData'))
  // ログ取得
  const log = await logStore.fetchLog(selectedApp.value.appId, dateStr)
  loader.hide(loaderId)

  if (!log) {
    toast.add({
      severity: 'warn',
      summary: t('history.notice.noLogData'),
      detail: t('history.notice.noLogDataDetail'),
      group: 'notices',
      life: 2500
    })
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
  const result = logSchema.value.safeParse(log)
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
    if (!saved) {
      throw new Error(t('history.notice.saveFailed'))
    }
    toast.add({
      severity: 'success',
      summary: t('history.notice.saveSuccess'),
      detail: t('history.notice.saveSuccessDetail', {
        appName: selectedApp.value?.name,
        date: formatDate(targetDate.value),
      }),
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
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : t('history.notice.saveFailed')
    //console.error('Failed to save history log:', e)
    confirmModalVisible.value = false
    toast.add({
      severity: 'error',
      summary: t('history.notice.saveFailedTitle'),
      detail: errorMessage,
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
  (newApp) => {
    if (newApp) {
      calendarDraftDate.value = today.value // アプリ変更時はカレンダーの選択を today で初期化
      targetDate.value = null // 対象日もリセット
      resetForm() // フォームもリセット
      historyStatsReloadKey.value++ // 履歴統計の再読み込みトリガー
    }
  },
  { immediate: true }
)

// Ad Setting
const adConfig: Record<string, AdProps> = {
  // 上部バナー広告
  banner: {
    adType: 'carousel',
    adItems: [
      { image: '/sample/ad_2.jpg',  link: 'https://example.com/?ad=2',  alt: '1020x160' },
      { image: '/sample/ad_3.jpg',  link: 'https://example.com/?ad=3',  alt: '724x145' },
      { image: '/sample/ad_4.jpg',  link: 'https://example.com/?ad=4',  alt: '940x140' },
      { image: '/sample/ad_9.png',  link: 'https://example.com/?ad=9',  alt: '728x90' },
      { image: '/sample/ad_10.png', link: 'https://example.com/?ad=10', alt: '728x90' },
      { image: '/sample/ad_11.png', link: 'https://example.com/?ad=11', alt: '728x90' },
    ],
    adWidth: 1020, // カルーセル画像の最大幅を指定
  },
  // インライン広告
  inline: {
    adType: 'image',
    adItems: [
      { image: '/sample/ad_5.jpg',  link: 'https://example.com/?ad=5',  alt: '広告バナー 5 (616x353)' },
      { image: '/sample/ad_6.jpg',  link: 'https://example.com/?ad=6',  alt: '広告バナー 6 (1200x652)' },
      { image: '/sample/ad_7.jpg',  link: 'https://example.com/?ad=7',  alt: '広告バナー 7 (1200x675)' },
      { image: '/sample/ad_8.jpg',  link: 'https://example.com/?ad=8',  alt: '広告バナー 8 (616x353)' },
      { image: '/sample/ad_14.jpg', link: 'https://example.com/?ad=14', alt: '広告バナー 14 (800x800)' },
      { image: '/sample/ad_15.jpg', link: 'https://example.com/?ad=15', alt: '広告バナー 15 (1080x1080)' },
      { image: '/sample/ad_16.jpg', link: 'https://example.com/?ad=16', alt: '広告バナー 16 (300x250)' },
      { image: '/sample/ad_17.jpg', link: 'https://example.com/?ad=17', alt: '広告バナー 17 (600x338)' },
    ],
    // adHeight: 250,
  }
}

</script>

<template>
  <div class="w-full p-2 md:p-4">
      <CommonPageHeader
        :title="t('history.header')"
        :adProps="adConfig.banner"
      />

      <!-- 入力エリアとログ表示エリア -->
      <div class="w-full flex flex-wrap md:flex-nowrap gap-6">
          <!-- 左カラム: 入力フォーム -->
          <section class="w-full md:w-1/2 lg:w-2/5 min-h-fit max-h-max flex flex-col gap-6">
              <!-- アプリ選択 -->
              <SelectApps
                v-if="!appStore.isLoading"
                v-model="selectedApp"
              />

              <!-- 対象日付 -->
              <div class="flex flex-wrap md:flex-nowrap justify-start items-center gap-4">
                <CalendarUI
                  v-model="calendarDraftDate"
                  :label="t('history.targetDate')"
                  :commit="true"
                  :commitLabel="t('history.targetDateChange')"
                  :commitDisabled="selectedApp === null"
                  :defaultDate="today"
                  :maxDate="today"
                  customIcon="📅"
                  :withFooter="true"
                  :pt="{ root: 'flex-grow w-max md:w-max', panel: 'w-[calc(100%_-_20px)] md:w-80' }"
                  containerClass="flex-1 w-64"
                  @commit="handleDateCommit"
                />
                <div class="flex-grow w-full md:w-1/2 flex items-center justify-start">
                  <Message v-if="targetDate" severity="info" size="small" class="mt-0 md:mt-6.5 p-2.5 w-full text-base">
                    {{ t('history.currentTargetDate') }}: <strong>{{ formatDate(targetDate) }}</strong>
                  </Message>
                </div>
              </div>

              <!-- 履歴の登録 -->
              <div class="flex flex-col gap-2">
                  <h3>{{ t('history.register') }}</h3>
                  <div class="input-group-row">
                    <label for="total-pull-count" class="input-group-label">{{ t('history.totalPullCount') }}</label>
                    <div class="input-group-control">
                      <InputNumber
                        v-model="totalPullCount"
                        inputId="total-pull-count"
                        :placeholder="t('history.totalPullCountPlaceholder')"
                        showButtons
                        :min="0"
                        :disabled="!targetDate"
                        class="input-number-sm"
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
                    </div>
                  </div>
                  <div class="input-group-row">
                    <label for="discharged-items" class="input-group-label">{{ t('history.highestRarityCount') }}</label>
                    <div class="input-group-control">
                      <InputNumber
                        v-model="dischargedItems"
                        inputId="discharged-items"
                        :placeholder="t('history.highestRarityCountPlaceholder')"
                        showButtons
                        :min="0"
                        :max="totalPullCount"
                        :disabled="totalPullCount === 0"
                        class="input-number-sm"
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
                    </div>
                  </div>
                  <div v-if="dischargedItems > 0" class="scrollable-container max-h-52 overflow-y-auto">
                    <label class="font-medium block text-md py-2 sticky top-0 z-20 bg-white dark:bg-[#070D19]">{{ t('history.droppedItemsRecord') }}</label>
                    <PullItemDetail
                      :maxEntries="dischargedItems"
                      v-model="dropDetails"
                    />
                  </div>
                  <div class="input-group-row">
                    <label for="expense" class="input-group-label">{{ t('history.expense') }}</label>
                    <div class="input-group-control">
                      <InputNumber
                        v-model="expense"
                        inputId="expense"
                        :placeholder="t('history.expensePlaceholder')"
                        showButtons
                        :minFractionDigits="0"
                        :maxFractionDigits="2"
                        :useGrouping="true"
                        :min="0"
                        :max="9999999"
                        :disabled="!targetDate"
                        class="input-number-md"
                      />
                      <div class="min-w-[3rem] px-1 text-md font-medium text-surface-500 truncate">
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
                    </div>
                  </div>
                  <!-- モーダル: 計算機 -->
                  <CalculatorModal
                    v-if="showCalculator"
                    :modelValue="expense"
                    @commit-add="handleCommitAdd"
                    @commit-overwrite="handleCommitOverwrite"
                    @close="showCalculator = false"
                  />
                  <div class="input-group-row">
                    <label for="tags" class="input-group-label pt-0 md:pt-2">{{ t('history.tags') }}</label>
                    <div class="input-group-control">
                      <InputTags
                        v-model="tags"
                        inputId="tags"
                        :placeholder="t('history.tagsPlaceholder', { maxTags: userStore.planLimits?.maxLogTags ?? 5 })"
                        :maxTags="userStore.planLimits?.maxLogTags ?? 5"
                        :maxLength="userStore.planLimits?.maxLogTagLength ?? 22"
                        class="w-full min-h-12 max-h-max"
                        :disabled="!targetDate"
                        tagPrefix="symbol"
                      />
                    </div>
                  </div>
                  <div class="input-group-row items-start! mb-4!">
                    <label for="note" class="input-group-label pt-0 md:pt-2">{{ t('history.activity') }}</label>
                    <div class="input-group-control">
                      <div class="flex-grow w-full">
                        <Textarea
                          v-model="freeText"
                          inputId="note"
                          autoResize
                          :placeholder="t('history.activityPlaceholder', { maxLength: maxTextLength })"
                          rows="3"
                          :maxlength="maxTextLength"
                          :disabled="!targetDate"
                          @input="textLength = freeText.length"
                          :style="{ minWidth: 'calc(100% - 10rem)' }"
                        />
                        <Message size="small" severity="secondary" variant="simple" class="text-surface dark:text-gray-500">
                          {{ t('history.inputCharacterCount') }}: {{ textLength }}</Message>
                      </div>
                    </div>
                  </div>
                  <div class="flex justify-between items-center gap-2">
                    <Button
                      :label="t('history.resetInput')"
                      class="btn btn-alternative w-1/2 lg:w-1/3 px-3 py-2 text-center text-base"
                      @click="resetForm"
                      :disabled="!selectedApp || !targetDate"
                      v-blur-on-click
                    />
                    <Button
                      :label="t('history.saveLog')"
                      fluid
                      class="btn btn-primary w-1/2 lg:w-2/3 px-3 py-2 text-center text-base"
                      @click="submitLog"
                      :disabled="!selectedApp || !targetDate"
                      v-blur-on-click
                    />
                  </div>
              </div>

              <!-- 広告バナー -->
              <div class="w-full h-max">
                <CommonEmbedAd v-bind="adConfig.inline" />
              </div>

          </section>

          <!-- 右カラム: 過去ログとグラフ -->
          <section class="w-full md:w-1/2 lg:w-3/5 mt-0 flex flex-col gap-4">
              <!-- 履歴推移グラフ -->
              <HistoryChart
                :label="t('history.historyTrend')"
                :key="historyChartReloadKey"
              />

              <!-- 対象アプリの履歴統計 -->
              <HistoryStats
                :key="historyStatsReloadKey"
              />

              <!-- 履歴一覧 -->
              <HistoryList
                :label="t('history.latestHistoryList')"
                :toDate="todayString"
                :limit="7"
                :highlightDate="formatDate(targetDate)"
                :key="historyListReloadKey"
              />

          </section>
      </div>

      <!-- 確認モーダル -->
      <LogConfirmModal
        :visible="confirmModalVisible"
        :logData="pendingLogData"
        :validationErrors="pendingValidationErrors"
        @update:visible="confirmModalVisible = $event"
        @close="handleCloseModal"
        @confirm="handleConfirmSave"
      />

  </div>
</template>
