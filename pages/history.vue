<script setup lang="ts">
import { z } from 'zod'
import { useToast } from "primevue/usetoast"
import { useOptionStore } from '~/stores/useOptionStore'
import { useAppStore } from '~/stores/useAppStore'
import { useLoaderStore } from '~/stores/useLoaderStore'

// Stores
const optionStore = useOptionStore()
const appStore = useAppStore()
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
const selectedApp = ref<AppData | null>(null) // 選択されたアプリケーション
const calendarDraftDate = ref<CalenderDate>(null) // カレンダーの未確定日付
const targetDate = ref<CalenderDate>(null) // 確定した対象日付
const totalPullCount = ref<number>(0) // ガチャ回数
const dischargedItems = ref<number>(0) // 最高レア排出数
const dropDetails = ref<DropDetail[]>([]) // 排出内容の詳細（任意）
const expense = ref<number>(0) // 課金額
const tags = ref<string[]>([]) // タグ（任意）
const freeText = ref<string>('') // メモ（任意）
const textLength = ref<number>(0) // メモの文字数
const home = ref<{ icon: string }>({ icon: 'pi pi-home' })
const locations = ref<Record<string, string>[]>([
  { label: '履歴登録' },
])
const showCalculator = ref<boolean>(false) // 計算機モーダルの表示状態
const today = new Date()
const maxTextLength = 200 // メモの最大文字数
const confirmModalVisible = ref<boolean>(false) // 確認モーダルの表示状態
const pendingLogData = ref<DateLog | null>(null) // 確認モーダルに渡すログデータ
const pendingValidationErrors = ref<Record<string, string[]> | null>(null) // 確認モーダルに渡すバリデーションエラー
//const loaderId = loader.show('読み込み中...') // ローダー表示（IDを取得）

// Computed
const currentAppList = computed(() => {
  return appStore.appList.filter(app => app.appId !== 'dummy') // ダミーアプリを除外
})
// 通貨表示（選択アプリに依存）
const currencyUnit = computed(() =>
  selectedApp.value?.currency_unit ?? 'JPY'
)

// Methods
const handleDateCommit = (date: CalenderDate) => {
  targetDate.value = date
  //calendarDraftDate.value = null // カレンダーの未確定日付をクリア

  const loaderId = loader.show('', document.getElementById('graph-area')) // デバッグ：ローダー表示
  //const loaderId = loader.show('対象日のデータを読み込み中...') // デバッグ：ローダー表示
  setTimeout(() => {
    loader.hide(loaderId) // ローダー非表示
  }, 1500)
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
// ログ保存処理（送信用 DateLog の構築）
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
  /*
  // View用に変換
  const rarityMap = new Map(optionStore.rarityOptions.map(opt => [opt.label, opt]))
  const symbolMap = new Map(optionStore.symbolOptions.map(opt => [opt.label, opt]))
  const views = toDropDetailViews(dropDetails.value, { rarityMap, symbolMap })
  // 保存するログの内容をコンソールに出力（デバッグ）
  views.forEach((v, i) => {
    console.log(
        `${i + 1}件目: ${v.rarityDisplay} - ${v.name ?? '(未入力)'} ${v.symbolDisplay ? `[${v.symbolDisplay}]` : ''}`
    )
  })
  */

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
  // API送信処理をここに追加
  // ...await apiClient.post()...
  console.log('✅ 送信データ:', pendingLogData.value)
  resetForm()
  confirmModalVisible.value = false
  toast.add({
    severity: 'success',
    summary: 'ログ保存完了',
    detail: `アプリ: ${selectedApp.value?.name} / 対象日: ${formatDate(targetDate.value)}`,
    group: 'notices',
    life: 3000,
  })
}
// 確認モーダルで「キャンセル」 or 閉じる
function handleCloseModal() {
  confirmModalVisible.value = false
}
// リセット処理
function resetForm() {
    totalPullCount.value = 0
    dischargedItems.value = 0
    expense.value = 0
    tags.value = []
    freeText.value = ''
    textLength.value = 0
}
function formatDate(dateValue: CalenderDate): string {
  let _d = null
  if (Array.isArray(dateValue)) {
    for (const v of dateValue) {
      if (v instanceof Date) _d = v
      break
    }
  } else if (dateValue instanceof Date) {
    _d = dateValue
  }
  if (!_d) return '' // 日付が無効な場合は空文字を返す
  return `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`
}
// DropDetail[] → DropDetailView[] 変換（UI表示用）
function toDropDetailViews(details: DropDetail[], options: {
    rarityMap?: Map<string, SymbolOption>
    symbolMap?: Map<string, SymbolOption>
} = {}): DropDetailView[] {
    const { rarityMap, symbolMap } = options

    return details.map((entry) => {
        const rarityOpt = rarityMap?.get(entry.rarity ?? '') ?? null
        const symbolOpt = symbolMap?.get(entry.marker ?? '') ?? null

        return {
            ...entry,
            rarityDisplay: rarityOpt ? `${rarityOpt.symbol ?? ''}${rarityOpt.label}` : entry.rarity ?? '',
            symbolDisplay: symbolOpt ? `${symbolOpt.symbol ?? ''}${symbolOpt.label}` : entry.marker ?? '',
        }
    })
}

// Lifecycle Hooks
onMounted(async () => {
  await appStore.loadApps()
})

// Watchers
/*
watch(() => appStore.appList, (newApps, prevApps) => {
  console.log('App list updated:', newApps, prevApps)
}, { immediate: true })
*/

// Styling
const inputFieldRow = 'flex flex-nowrap justify-start items-center gap-2'
const inputFieldLabel = 'font-medium block w-40 min-w-[8rem]'

</script>

<template>
  <div class="w-full mx-auto px-4 py-6">
      <!-- Page Header -->
      <div id="page-header" class="flex justify-start text-sm text-surface-500 -mt-2 mb-4">
        <Breadcrumb :home="home" :model="locations" />
      </div>

      <!-- 入力エリアとログ表示エリア -->
      <div class="w-full flex space-x-6">
          <!-- 左カラム: 入力フォーム -->
          <section class="w-2/5 min-w-[448px] space-y-6">
              <!-- アプリ選択 -->
              <SelectApps
                v-if="!appStore.isLoading"
                v-model="selectedApp"
                :apps="currentAppList"
              />

              <!-- 対象日付 -->
              <div class="flex justify-start items-center gap-4">
                <CalendarUI
                  v-model="calendarDraftDate"
                  label="対象日"
                  :commit="true"
                  commitLabel="変更"
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

              <!-- 最新ログの登録 -->
              <div class="space-y-2">
                  <h3>最新ログの登録</h3>
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
                    <div class="w-12 px-1 text-md font-medium text-surface-500">{{ currencyUnit }}</div>
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
                    <label for="note" :class="`${inputFieldLabel} pt-2`">メモ（任意）</label>
                    <div class="flex-grow w-full">
                      <Textarea
                        v-model="freeText"
                        inputId="note"
                        autoResize
                        :placeholder="`メモ（${maxTextLength}文字以内）`"
                        rows="3"
                        :maxlength="maxTextLength"
                        :disabled="!targetDate"
                        @input="textLength = freeText.length"
                        :style="{ minWidth: 'calc(100% - 10rem)' }"
                      />
                      <Message size="small" severity="secondary" variant="simple" class="text-surface dark:text-gray-500">入力文字数: {{ textLength }}</Message>
                    </div>
                  </div>
                  <Button
                    label="ログを保存"
                    fluid
                    class="btn btn-primary px-3 py-2 text-center text-base"
                    @click="submitLog"
                    :disabled="!selectedApp || !targetDate"
                    v-blur-on-click
                  />
              </div>
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
              <!-- 推移グラフ (ダミー) -->
              <div class="border rounded p-4 border-surface-300 dark:border-surface-700 dark:bg-gray-800/40">
                  <h2 class="text-primary-600 dark:text-primary-500 font-semibold mb-2">ガチャ履歴の推移（直近）</h2>
                  <div id="graph-area" class="h-64 bg-gray-200 dark:bg-gray-700/40 flex items-center justify-center text-surface-400 dark:text-surface-500">
                    <span class="text-antialiasing">[グラフ表示エリア]</span>
                  </div>
              </div>

              <!-- ログ一覧 -->
              <div class="border rounded p-4 border-surface-300 dark:border-surface-700 dark:bg-gray-800/40">
                  <h2 class="text-primary-600 dark:text-primary-500 font-semibold mb-2">過去ログ一覧（直近）</h2>
                  <div class="-mx-4 border-b border-surface-300 dark:border-surface-700">
                    <table class="w-full text-sm border-t border-surface-300 dark:border-surface-700">
                        <thead>
                            <tr class="bg-surface-100 dark:bg-gray-700/40 text-left">
                                <th class="py-1 px-2 font-medium text-antialiasing">日付</th>
                                <th class="py-1 px-2 font-medium text-antialiasing">回数</th>
                                <th class="py-1 px-2 font-medium text-antialiasing">最高レア</th>
                                <th class="py-1 px-2 font-medium text-antialiasing">課金額</th>
                                <th class="py-1 px-2 font-medium text-antialiasing">タグ</th>
                                <th class="py-1 px-2 font-medium text-antialiasing">メモ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="i in 7" :key="i" class="border-t border-surface-300 dark:border-surface-700">
                                <td class="py-1 px-2">2025-04-{{ new Date().getDate() - i }}</td>
                                <td class="py-1 px-2">10</td>
                                <td class="py-1 px-2">1</td>
                                <td class="py-1 px-2">3000</td>
                                <td class="py-1 px-2"></td>
                                <td class="py-1 px-2">📃</td>
                            </tr>
                        </tbody>
                    </table>
                  </div>
              </div>

              <!-- 対象日のログ統計 -->
              <div class="border rounded p-4 border-surface-300 dark:border-surface-700 dark:bg-gray-800/40">
                  <h2 class="text-primary-600 dark:text-primary-500 font-semibold mb-2">対象日のログ統計</h2>
                  <div class="h-12 bg-gray-200 dark:bg-gray-700/40 flex items-center justify-center text-surface-400 dark:text-surface-500">
                    <span class="text-antialiasing">{{ targetDate }}</span>
                  </div>
              </div>
          </section>
      </div>
  </div>
</template>
