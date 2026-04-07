<script setup lang="ts">
import { DateTime } from "luxon"
import { useToast } from "primevue/usetoast"
import { useI18n } from "vue-i18n"
import { z } from "zod"
import { useAppStore } from "~/stores/useAppStore"
import { useCurrencyStore } from "~/stores/useCurrencyStore"
import { useLoaderStore } from "~/stores/useLoaderStore"
import { useLogStore } from "~/stores/useLogStore"
import { useUserStore } from "~/stores/useUserStore"
import { formatDate } from "~/utils/date"

definePageMeta({ requiresCurrency: true })

// Stores & Plugins
const userStore = useUserStore()
const appStore = useAppStore()
const logStore = useLogStore()
const loader = useLoaderStore()
const currencyStore = useCurrencyStore()
const toast = useToast()
const { t, locale } = useI18n()

// Helpers
/** 選択アプリの通貨データ */
const currencyData = computed(() => {
    const code = appStore.app?.currency_code
    return code ? currencyStore.get(code) : undefined
})
/** 小数桁（minor_unit） */
const minorUnit = computed<number>(() => currencyData.value?.minor_unit ?? 0)
/** UI上の小数 → 最小単位整数へ */
const toAmount = (decimal: number) => {
    const pow = minorUnit.value > 0 ? 10 ** minorUnit.value : 1
    // 0 未満は 0 に丸め
    return Math.max(0, Math.round((Number(decimal) || 0) * pow))
}
/** 最小単位整数 → UI表示用小数へ */
const toDecimal = (amount?: number | null) => {
    const pow = minorUnit.value > 0 ? 10 ** minorUnit.value : 1
    return (Number(amount) || 0) / pow
}

// Validation Schema
const logSchema = computed(() =>
    z.object({
        appId: z.string().min(1, t("validation.selectedAppEmpty")),
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, t("validation.invalidDate")),
        total_pulls: z.number().min(0),
        discharge_items: z.number().min(0),
        drop_details: z
            .array(
                z.object({
                    rarity: z.string().nullable().optional(),
                    name: z.string().nullable().optional(),
                    marker: z.string().nullable().optional(),
                }),
            )
            .optional(),
        expense_decimal: z.number().min(0),
        tags: z.array(z.string()).optional(),
        free_text: z
            .string()
            .max(userStore.planLimits?.maxLogTextLength ?? 250)
            .optional(),
    }),
)
const validationErrors = ref<Record<string, string[]>>({})

// State & Local variables
const calendarDraftDate = ref<CalenderDate>(null) // カレンダーの未確定日付
const targetDate = ref<CalenderDate>(null) // 確定した対象日付
const totalPullCount = ref<number>(0) // ガチャ回数
const dischargedItems = ref<number>(0) // 最高レア排出数
const dropDetails = ref<DropDetail[]>([]) // 排出内容の詳細（任意）
const expenseDecimal = ref<number>(0) // 課金額（小数許可）
const tags = ref<string[]>([]) // タグ（任意）
const freeText = ref<string>("") // メモ（任意）
const textLength = ref<number>(0) // メモの文字数
const showCalculator = ref<boolean>(false) // 計算機モーダルの表示状態
const today = computed(() => getTodayByApp(selectedApp.value))
const todayString = computed(() => formatDate(today.value))
const maxTextLength = computed(
    () => userStore.planLimits?.maxLogTextLength ?? 250,
) // メモの最大文字数
const confirmModalVisible = ref<boolean>(false) // 確認モーダルの表示状態
const pendingLogData = ref<Partial<DateLog> | null>(null) // 確認モーダルに渡すログデータ
const pendingValidationErrors = ref<Record<string, string[]> | null>(null) // 確認モーダルに渡すバリデーションエラー
const historyChartReloadKey = ref<number>(0) // 履歴グラフの再読み込みキー（強制更新用）
const historyStatsReloadKey = ref<number>(0) // 履歴統計の再読み込みキー（強制更新用）
const historyListReloadKey = ref<number>(0) // 履歴リストの再読み込みキー（強制更新用）
const isDemoUser = computed(() => userStore.hasUserRole("demo")) // デモユーザーかどうか
const statsImageModalVisible = ref<boolean>(false)
const canDownloadImage = computed<boolean>(() => {
    const app = selectedApp.value
    const date = targetDate.value
    if (!app || !date) return false
    const iso = formatDate(date)
    const appMap = logStore.logs.get(app.appId)
    return Boolean(appMap?.get(iso))
})

// Computed
const selectedApp = computed<AppData | null>({
    get: () => appStore.app,
    set: (val: AppData | null) => appStore.setApp(val),
})
// 通貨表示（選択アプリに依存）
const currencyUnit = computed(() => {
    const code = selectedApp.value?.currency_code
    if (!code) {
        // アプリが選択されていない場合はデフォルト通貨コードを使用
        return currencyStore.defaultCurrencyCode(locale.value)
    }
    return currencyStore.get(code)?.code ?? code
})

// Methods
function getTodayByApp(app: AppData | null): Date {
    // 基準: 現在日時（タイムゾーンも必要なら `const now = DateTime.now().setZone('Asia/Tokyo')` 等）
    const now = DateTime.local()
    let baseDate = now
    if (app?.sync_update_time && typeof app.date_update_time === "string") {
        const [h, m] = app.date_update_time.split(":").map(Number)
        if (!Number.isNaN(h) && !Number.isNaN(m)) {
            // 同日0時をベースに、指定時刻で境界DateTime生成
            const boundary = now.set({
                hour: h,
                minute: m,
                second: 0,
                millisecond: 0,
            })
            // 現在時刻が境界より前なら1日前
            if (now < boundary) {
                baseDate = now.minus({ days: 1 })
            }
        }
    }
    return baseDate.startOf("day").toJSDate()
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
    const loaderId = loader.show(t("history.loadingLogData"))
    // ログ取得
    const log = await logStore.fetchLog(selectedApp.value.appId, dateStr)
    loader.hide(loaderId)

    if (!log) {
        toast.add({
            severity: "warn",
            summary: t("history.notice.noLogData"),
            detail: t("history.notice.noLogDataDetail"),
            group: "notices",
            life: 2500,
        })
        return
    }
    // 既存のログがある場合はそれを反映
    totalPullCount.value = log.total_pulls || 0
    dischargedItems.value = log.discharge_items || 0
    dropDetails.value = log.drop_details || []
    // サーバは expense_decimal を返す（DailyLogController で対応）
    // 念のため expense_amount が来ても復元
    if (typeof log.expense_decimal === "number") {
        expenseDecimal.value = log.expense_decimal
    } else if (typeof log.expense_amount === "number") {
        expenseDecimal.value = toDecimal(log.expense_amount)
    } else if (typeof log.expense === "number") {
        // 古いレスポンス互換
        expenseDecimal.value = toDecimal(log.expense)
    } else {
        expenseDecimal.value = 0
    }
    tags.value = log.tags || []
    freeText.value = log.free_text || ""
    textLength.value = freeText.value.length
}
// 計算機を開く
const openCalculator = () => {
    showCalculator.value = true
}
// 計算機からの結果受取（加算）
const handleCommitAdd = (addValue: number) => {
    expenseDecimal.value += addValue
    showCalculator.value = false
}
// 計算機からの結果受取（置き換え）
const handleCommitOverwrite = (newValue: number) => {
    expenseDecimal.value = newValue
    showCalculator.value = false
}
// 履歴保存処理（送信前に DateLog を構築（UIは小数、送信は整数））
function submitLog() {
    if (!selectedApp.value || !targetDate.value) return

    const dateStr = formatDate(targetDate.value)
    const uiLog: Partial<DateLog> = {
        appId: selectedApp.value.appId,
        date: dateStr,
        total_pulls: totalPullCount.value,
        discharge_items: dischargedItems.value,
        drop_details: [...dropDetails.value].filter(
            (d) => d.rarity || d.name || d.marker,
        ),
        expense_decimal: Number(expenseDecimal.value) || 0, // 検証は小数で
        tags: tags.value,
        free_text: freeText.value,
    }

    // Zodによる検証
    const result = logSchema.value.safeParse(uiLog)
    if (!result.success) {
        // 検証エラーがある場合
        validationErrors.value = result.error.flatten().fieldErrors
        pendingValidationErrors.value = result.error.flatten().fieldErrors
        pendingLogData.value = uiLog
        confirmModalVisible.value = true
        return
    }
    // 検証成功時
    validationErrors.value = {}
    pendingValidationErrors.value = null

    // API ペイロード生成（整数へ変換した expense_amount を付与）
    const payload: DateLog = {
        appId: uiLog.appId ?? "",
        date: uiLog.date ?? "",
        total_pulls: uiLog.total_pulls ?? 0,
        discharge_items: uiLog.discharge_items ?? 0,
        drop_details: uiLog.drop_details ?? [],
        expense_decimal: uiLog.expense_decimal ?? 0, // 確認モーダル表示用
        expense_amount: toAmount(uiLog.expense_decimal ?? 0),
        tags: uiLog.tags ?? [],
        free_text: uiLog.free_text ?? "",
        images: [],
        tasks: [],
        last_updated: new Date().toISOString(),
    }

    pendingLogData.value = payload
    confirmModalVisible.value = true
}
// 確認モーダルで「保存する」確定時
async function handleConfirmSave() {
    if (isDemoUser.value) return abortDemo()
    if (!pendingLogData.value) return
    try {
        // API送信処理
        const payload = { ...(pendingLogData.value as DateLog) }
        delete payload.expense_decimal
        const saved = await logStore.saveLog(payload)
        if (!saved) {
            throw new Error(t("history.notice.saveFailed"))
        }
        toast.add({
            severity: "success",
            summary: t("history.notice.saveSuccess"),
            detail: t("history.notice.saveSuccessDetail", {
                appName: selectedApp.value?.name,
                date: formatDate(targetDate.value),
            }),
            group: "notices",
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
        const msg =
            e instanceof Error ? e.message : t("history.notice.saveFailed")
        //console.error('Failed to save history log:', e)
        confirmModalVisible.value = false
        toast.add({
            severity: "error",
            summary: t("history.notice.saveFailedTitle"),
            detail: msg,
            group: "notices",
            life: 4000,
        })
    }
}
function abortDemo() {
    // デモユーザーの場合は何もしない
    toast.add({
        severity: "warn",
        summary: t("app.error.demoTitle"),
        detail: t("app.error.demoDetail"),
        group: "notices",
        life: 2500,
    })
    // 確認モーダルを閉じる
    confirmModalVisible.value = false
    return
}
// 履歴推移グラフのクリック日を受け取る
function handleHistoryChartSelect(dateStr: string) {
    const dt = DateTime.fromISO(dateStr, { zone: "local" })
    if (!dt.isValid) return
    const jsDate = dt.startOf("day").toJSDate()
    calendarDraftDate.value = jsDate
    handleDateCommit(jsDate) // 受け取った日付でコミット
}
// 履歴一覧からタグをクローン
function handleAddTag(tagText: string) {
    if (!selectedApp.value || !targetDate.value) return
    if (
        !tagText ||
        tags.value.includes(tagText) ||
        tags.value.length >= (userStore.planLimits?.maxLogTags ?? 5)
    )
        return
    tags.value.push(tagText)
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
    expenseDecimal.value = 0
    tags.value = []
    freeText.value = ""
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
    { immediate: true },
)

// Ad Setting
const adConfig: Record<string, AdProps> = {
    banner: {
        // 上部バナー広告
        adType: "none",
        //adHeight: 90,
    },
    inline: {
        // インライン広告
        adType: "none",
        //adHeight: 250,
    },
}
</script>

<template>
  <div class="w-full p-2 md:p-4">
      <Head>
        <Title>{{ `${t('history.header')} | ${t('app.name')}` }}</Title>
      </Head>
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
                        class="input-number-sm flex-grow md:flex-grow-0"
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
                        class="input-number-sm flex-grow md:flex-grow-0"
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
                        v-model="expenseDecimal"
                        inputId="expense"
                        :placeholder="t('history.expensePlaceholder')"
                        showButtons
                        :minFractionDigits="0"
                        :maxFractionDigits="minorUnit"
                        :useGrouping="true"
                        :min="0"
                        :max="999999999"
                        :disabled="!targetDate"
                        class="input-number-md flex-grow md:flex-grow-0"
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
                        :disabled="!targetDate || expenseDecimal === 0"
                        @click="expenseDecimal = 0"
                        v-blur-on-click
                      />
                    </div>
                  </div>
                  <!-- モーダル: 計算機 -->
                  <CalculatorModal
                    v-if="showCalculator"
                    :modelValue="expenseDecimal"
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
                          id="note"
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
                      class="btn btn-alt w-1/2 lg:w-1/3 px-3 py-2 text-center text-base"
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
                  <div class="w-full flex items-center justify-end">
                    <Button
                      :label="t('history.downloadShareImage')"
                      class="btn btn-alt w-full px-3 py-2 text-center text-base"
                      :disabled="!canDownloadImage"
                      @click="statsImageModalVisible = true"
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
                @select-date="handleHistoryChartSelect"
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
                @clone-tag="handleAddTag"
              />

          </section>
      </div>

      <!-- 確認モーダル -->
      <LogConfirmModal
        :visible="confirmModalVisible"
        :logData="(pendingLogData as DateLog | null)"
        :validationErrors="pendingValidationErrors"
        @update:visible="confirmModalVisible = $event"
        @close="handleCloseModal"
        @confirm="handleConfirmSave"
      />

      <!-- シェア画像モーダル -->
      <HistoryStatsImageModal
        v-if="selectedApp && targetDate"
        :visible="statsImageModalVisible"
        :app="(selectedApp as AppData)"
        :targetDate="formatDate(targetDate)"
        @update:visible="statsImageModalVisible = $event"
        @close="statsImageModalVisible = false"
      />

  </div>
</template>
