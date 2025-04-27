<script setup lang="ts">

// Local variables
const selectedApp = ref<App | null>(null) // 選択されたアプリケーション
const targetDate = ref<CalenderDate>(null) // 対象日付
const maxPullCount = ref<number>(0) // ガチャ回数
const dischargedItems = ref<number>(0) // 最高レア排出数
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

// Methods
// 計算機を開く
const openCalculator = () => {
  showCalculator.value = true
}
// モーダルからの結果受取（加算）
const handleCommitAdd = (addValue: number) => {
  expense.value += addValue
  showCalculator.value = false
}
// モーダルからの結果受取（置き換え）
const handleCommitOverwrite = (newValue: number) => {
  expense.value = newValue
  showCalculator.value = false
}

// Watches
watch(
  () => [selectedApp.value, targetDate.value],
  ([newApp, newDate]) => {
    if (newApp && newDate) {
      // ここで新しいアプリと日付を使って何か処理を行うことができます
      console.log('Selected App: ', newApp, 'Target Date: ', newDate)
    }
  },
  { immediate: true }
)

// Pass Through
const breadcrumbPT = {
  root: 'bg-transparent p-0 -mt-1 mb-1',
  list: 'bg-transparent h-6 flex justify-start items-baseline',
  item: 'bg-transparent text-surface-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 text-base',
  itemIcon: 'text-surface-500 dark:text-gray-400',
  separator: 'relative bg-transparent top-[1px] text-surface-300 dark:text-gray-600',
}
const inputNumberPT = {
  pcinputtext: {
    root: 'w-full border rounded px-3 py-2 border-surface dark:border-gray-700 dark:bg-gray-950 focus:ring-2 focus:ring-primary-200/50 dark:focus:ring-primary-800/40 disabled:bg-surface-200/50 disabled:text-surface-600/50 disabled:dark:bg-gray-800/40 disabled:dark:text-gray-200/40 disabled:dark:border-gray-600/40',
  },
  incrementButton: 'hover:text-primary disabled:text-surface-600/50',
  decrementButton: 'hover:text-primary disabled:text-surface-600/50',
}
const textareaPT = {
  root: {
    class: 'w-full border rounded px-3 py-2 border-surface dark:border-gray-700 dark:bg-gray-950 focus:ring-2 focus:ring-primary-200/50 dark:focus:ring-primary-800/40 disabled:bg-surface-200/50 disabled:text-surface-600/50 text-antialiasing text-sm',
    style: { minWidth: 'calc(100% - 10rem)' },
  }
}

</script>

<template>
  <div class="w-full mx-auto px-4 py-6">
      <!-- Page Header -->
      <div id="page-header" class="flex justify-start text-sm text-surface-500 -mt-2 mb-4">
        <Breadcrumb :home="home" :model="locations" :pt="breadcrumbPT" />
      </div>

      <!-- 入力エリアとログ表示エリア -->
      <div class="w-full flex space-x-6">
          <!-- 左カラム: 入力フォーム -->
          <section class="w-2/5 min-w-[448px] space-y-6">
              <!-- アプリ選択 -->
              <SelectApps v-model="selectedApp" />

              <!-- 対象日付 -->
              <CalendarUI
                v-model="targetDate"
                label="対象日"
                :commit="true"
                commitLabel="変更"
                :defaultDate="today"
                :maxDate="today"
                customIcon="📅"
                :withFooter="true"
                panelClass="w-80!"
              />

              <!-- 最新ログの登録 -->
              <div class="space-y-2">
                  <h3 class="text-primary-600 dark:text-primary-500 mb-1 font-semibold">最新ログの登録</h3>
                  <div class="flex flex-nowrap justify-start items-center gap-2">
                    <label for="max-pull-count" class="font-medium block w-40 min-w-[8rem]">ガチャ回数</label>
                    <InputNumber
                      v-model="maxPullCount"
                      inputId="max-pull-count"
                      placeholder="ガチャ回数"
                      showButtons
                      :min="0"
                      class="w-44 min-w-[6rem]"
                      :pt="inputNumberPT"
                    />
                    <Button
                      icon="pi pi-plus"
                      label="10"
                      class="btn btn-alternative p-2! text-base! m-0!"
                      @click="maxPullCount += 10"
                      v-blur-on-click
                    />
                    <Button
                      icon="pi pi-plus"
                      label="100"
                      class="btn btn-alternative p-2! text-base! m-0!"
                      @click="maxPullCount += 100"
                      v-blur-on-click
                    />
                    <Button
                      icon="pi pi-eraser"
                      label="0"
                      class="btn btn-alternative p-2! text-base! m-0!"
                      :disabled="maxPullCount === 0"
                      @click="maxPullCount = 0"
                      v-blur-on-click
                    />
                    <div class="w-full"></div>
                  </div>
                  <div class="flex flex-nowrap justify-start items-center gap-2">
                    <label for="discharged-items" class="font-medium block w-40 min-w-[8rem]">最高レア排出数</label>
                    <InputNumber
                      v-model="dischargedItems"
                      inputId="discharged-items"
                      placeholder="最高レア排出数"
                      showButtons
                      :min="0"
                      :max="maxPullCount"
                      :disabled="maxPullCount === 0"
                      class="w-44 min-w-[6rem]"
                      :pt="inputNumberPT"
                    />
                    <Button
                      icon="pi pi-plus"
                      label="10"
                      class="btn btn-alternative p-2! text-base! m-0!"
                      :disabled="maxPullCount < 10 || dischargedItems >= maxPullCount"
                      @click="dischargedItems += 10"
                      v-blur-on-click
                    />
                    <Button
                      icon="pi pi-plus"
                      label="100"
                      class="btn btn-alternative p-2! text-base! m-0!"
                      :disabled="maxPullCount < 100 || dischargedItems >= maxPullCount"
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
                  <div v-if="dischargedItems > 0" class="max-h-52 overflow-y-auto">
                    <label class="block text-md my-1">排出内容の記録（任意）</label>
                    <PullItemDetail :maxEntries="dischargedItems" />
                  </div>
                  <div class="flex flex-nowrap justify-start items-center gap-2">
                    <label for="expense" class="font-medium block w-40 min-w-[8rem]">課金額</label>
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
                      class="w-44 min-w-[8rem]"
                      :pt="inputNumberPT"
                    />
                    <div class="w-12 px-1 text-md font-medium text-surface-500">JPY</div>
                    <Button
                      icon="pi pi-calculator"
                      label=""
                      class="btn btn-alternative py-2! px-2.5! text-base m-0"
                      @click="openCalculator"
                      v-blur-on-click
                    />
                    <Button
                      icon="pi pi-eraser"
                      label="0"
                      class="btn btn-alternative p-2! text-base m-0"
                      :disabled="expense === 0"
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
                  <div class="flex flex-nowrap justify-start items-start gep-2">
                    <label for="tags" class="font-medium block w-40 min-w-[136px] pt-2">タグ（任意）</label>
                    <InputTags
                      v-model="tags"
                      inputId="tags"
                      placeholder="タグの追加（最大%maxTags%つまで）"
                      :maxTags="3"
                      :maxLength="20"
                      class="w-full min-h-12 max-h-max"
                      tagPrefix="symbol"
                    />
                  </div>
                  <div class="flex flex-nowrap justify-start items-start gap-2 mb-4">
                    <label for="note" class="font-medium block w-40 min-w-[8rem] pt-2">メモ（任意）</label>
                    <div class="flex-grow w-full">
                      <Textarea
                        v-model="freeText"
                        inputId="note"
                        autoResize
                        :placeholder="`メモ（${maxTextLength}文字以内）`"
                        rows="3"
                        :maxlength="maxTextLength"
                        @input="textLength = freeText.length"
                        :pt="textareaPT"
                      />
                      <Message size="small" severity="secondary" variant="simple">入力文字数: {{ textLength }}</Message>
                    </div>
                  </div>
                  <Button
                    label="ログを保存"
                    fluid
                    class="btn btn-primary px-3 py-2 text-center text-base"
                    @click=""
                    :disabled="!selectedApp || !targetDate"
                    v-blur-on-click
                  />
              </div>
          </section>

          <!-- 右カラム: 過去ログとグラフ -->
          <section class="w-3/5 mt-0 space-y-4">
              <!-- 推移グラフ (ダミー) -->
              <div class="border rounded p-4 border-surface-300 dark:border-surface-700 dark:bg-gray-800/40">
                  <h2 class="text-primary-600 dark:text-primary-500 font-semibold mb-2">ガチャ履歴の推移（直近）</h2>
                  <div class="h-64 bg-gray-200 dark:bg-gray-700/40 flex items-center justify-center text-surface-400 dark:text-surface-500">
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
