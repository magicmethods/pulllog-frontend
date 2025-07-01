<script setup lang="ts">
import { z } from 'zod'
import { useOptionStore } from '~/stores/useOptionStore'

// Props/Emits
const props = defineProps<{
    visible: boolean
    app?: AppData
}>()
const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'submit', value: AppData): void
}>()

// Stores
const optionStore = useOptionStore()

// Validation schema
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
const schema = z.object({
    name: z.string().min(1, 'アプリケーション名は必須です'),
    url: z.string().url('URLの形式が不正です').optional().or(z.literal('')).nullable(),
    description: z.string().max(400, '400文字以内で入力してください').optional().or(z.literal('')).nullable(),
    currency_unit: z.string().optional().or(z.literal('')).nullable(),
    date_update_time: z.string().regex(timeRegex, '無効な時間です').optional().or(z.literal('')).nullable(),
    //raw_date_update_time: z.any().optional(), // 時刻の入力値は内部で処理されるため検証はスキップする
    sync_update_time: z.boolean().optional(),
    rarity_defs: z.any().optional(), // 入力検証スキップ
    marker_defs: z.any().optional(), // 入力検証スキップ
    task_defs: z.any().optional(), // 未実装
})
// biome-ignore lint:/suspicious/noExplicitAny
const errors = ref<any>(null)

// Refs & Local variables
const rawDateUpdateTime = ref<Date | null>(null)
//const formData = ref<AppData>({...createAppDataFromApp(props.app)})
const formData = ref<AppData>({} as AppData) // 初期値は空のオブジェクト
const maxDescLength = 400
const descLength = ref<number>(0)
const activeEmojiPickerId = ref<string | null>(null)
const tooltips = {
    appName:        'アプリ名はあなたが管理しやすい名称を自由に設定できます。<span class="tooltip-warning">※アプリ名は入力必須です</span>',
    appUrl:         '公式サイトや攻略サイトなどの関連するWEBサイトを設定できます。指定されたURLからアイコン画像が自動取得されます。',
    appDesc:        `アプリケーションの説明等を自由に入力できます（${maxDescLength}文字以内）。`,
    appImage:       'あなたの好きな画像をこのアプリケーション用の画像として設定できます。この画像は指定URLから自動取得するアイコン画像よりも優先されます。',
    currencyUnit:   '対象のアプリケーションに課金する際に取り扱われる通貨単位を指定します。',
    dateUpdateTime: '対象のアプリケーションにおける日付が切り替わる時刻です。一般的にこの時間を跨ぐことでログイン日付が再計算されます。<br>設定した時刻はPullLogでのログ登録時の対象日付の更新時間に同期させることが可能です。',
    rarityDefs:     'アプリケーション内で使用されているレアリティの定義リストです。排出リストのレアリティオプションの初期リストとして使用されます。<br>排出リストの登録時に追加することもできますが、その場合はこの定義リストは更新されません。<br>永続的に使用する際はこの定義リストを設定することをお勧めします。',
    markerDefs:     'PullLogの排出リストのログ記録時に任意にマーキングを行うためのマーカーの定義リストです。排出リストのマーキングオプションの初期マーカーリストとして使用されます。<br>排出リストの登録時に追加することもできますが、その場合はこの定義リストは更新されません。<br>永続的に使用する際はこの定義リストを設定することをお勧めします。',
}

// Computed
const isShown = computed(() => props.visible ?? false)
const isEditMode = computed(() => props.app?.appId && props.app?.appId !== '')
const isValidAll = computed(() => {
    // アプリ名が空でなく、全フィールドのバリデーションが正常かどうかをチェック
    return errors.value === null && formData.value?.name !== ''
})

// Methods
// 初期化用ファクトリ
function createAppDataFromApp(app?: AppData): AppData {
    // 通貨単位の初期値を設定
    const matchCurrencyUnit = optionStore.currencyOptions.filter(o => o.value === app?.currency_unit).map(o => o.desc ? o.desc : o.label)
    const currencyUnit = matchCurrencyUnit.length > 0 ? matchCurrencyUnit[0] : app?.currency_unit ?? null
    // 日付更新時間の初期値を設定
    if (app?.date_update_time) {
        const [hour, minute] = app.date_update_time.split(':').map(Number)
        rawDateUpdateTime.value = new Date(new Date().setHours(hour, minute, 0, 0)) as Date | null
    } else {
        rawDateUpdateTime.value = new Date(new Date().setHours(0, 0, 0, 0)) as Date | null
    }
    // 新規登録（引数 app がない）時は InputOptions の初期値を設定
    let defaultRarityDefs = app?.rarity_defs ?? []
    let defaultMarkerDefs = app?.marker_defs ?? []
    if (!app) {
        defaultRarityDefs = [...optionStore.rarityOptions]
        defaultMarkerDefs = [...optionStore.symbolOptions]
    }
    const defaultAppData: AppData = {
        appId: app?.appId ?? '',
        name: app?.name ?? '',
        url: app?.url ?? '',
        description: app?.description ?? '',
        currency_unit: currencyUnit,
        date_update_time: app?.date_update_time ?? '',
        sync_update_time: app?.sync_update_time ?? false,
        rarity_defs: defaultRarityDefs,
        marker_defs: defaultMarkerDefs,
        task_defs: app?.task_defs ?? [],
    }
    //console.log('AppEditModal::createAppDataFromApp:', app, defaultAppData, rawDateUpdateTime.value)
    return defaultAppData
}
// ツールチップを表示する
function showTooltip(key: string) {
    return {
        value: tooltips[key as keyof typeof tooltips] ?? '',
        escape: false,
        pt: {
            root: 'pb-1',
            text: 'w-max max-w-[20rem] p-3 bg-surface-600 text-white dark:bg-gray-800 dark:shadow-lg font-medium text-xs',
            arrow: 'w-2 h-2 rotate-[45deg] border-b border-4 border-surface-600 dark:border-gray-800',
        }
    }
}
// TimePicker の日付値を HH:mm 形式に変換
function toTimeString(d: CalenderDate): string {
    if (!d || !(d instanceof Date)) return ''
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
}
// フォームの値を検証
function validateForm(): boolean {
    const result = schema.safeParse(formData.value)
    if (!result.success) {
        const { error } = result
        //console.warn('Validation Error:', error.issues, error.format(), error.flatten())
        errors.value = error.flatten().fieldErrors
    } else {
        errors.value = null
    }
    return result.success
}
// Submit ハンドラ
function handleSubmit() {
    if (!validateForm()) return

    // フォームの値が有効な場合、親コンポーネントの submit イベントを発火
    emit('submit', { ...formData.value })
    emit('update:visible', false)
}

// Watchers
watch(() => props.visible, (val) => {
    // モーダルの表示状態を監視
    if (val) {
        // モーダルが表示されたときに初期値を設定
        formData.value = {...createAppDataFromApp(props.app)}
        descLength.value = formData.value.description?.length ?? 0
        if (!isEditMode.value) {
            // 新規登録モードの場合は、初期値を設定
            formData.value.rarity_defs = [...optionStore.rarityOptions]
            formData.value.marker_defs = [...optionStore.symbolOptions]
        }
    } else {
        // モーダルが非表示になったときに初期値をリセット
        formData.value = {...createAppDataFromApp()}
        descLength.value = 0
    }
    //console.log(`AppEditModal: ${val ? 'shown' : 'hidden'} / mode: ${isEditMode.value ? 'edit' : 'register'}`, formData.value)
}, { immediate: true })
watch(() => formData.value, (val) => {
    // フォーム値が変更されたらバリデーション実行
    validateForm()
}, { deep: true })
watch(() => rawDateUpdateTime.value, (val) => {
    // 日付更新時間が変更されたら、rawDateUpdateTime を更新
    formData.value.date_update_time = val ? toTimeString(val) : ''
}, { immediate: true })

</script>

<template>
    <Dialog
        v-model:visible="isShown"
        :maximizable="true"
        modal
        id="appEditModal"
        :header="`アプリケーションの${isEditMode ? '設定編集' : '新規追加'}`"
        :dismissableMask="true"
        :blockScroll="true"
        :breakpoints="{ '960px': '80vw', '575px': '90vw' }"
        appendTo="self"
        :style="{ width: '80vw', height: '80vh' }"
    >
        <div class="flex flex-wrap md:flex-nowrap justify-between items-start gap-4">

            <div class="w-full md:w-1/2">
                <Fieldset legend="アプリケーションの基本情報">
                    <p v-if="false" class="lead">PullLogで取り扱うアプリケーションの登録内容を設定します。</p>
                    <div class="mb-4">
                        <label for="app_name" class="label-flex text-sm">
                            <span class="required">アプリケ―ション名</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('appName')"></i>
                        </label>
                        <InputText
                            id="app_name"
                            v-model="formData.name"
                            placeholder="例: FGO"
                            class="w-full"
                        />
                        <Message v-if="errors?.name" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.name.join(', ') }}
                        </Message>
                    </div>

                    <div class="mb-4">
                        <label for="piblic_url" class="label-flex text-sm">
                            <span>WEBサイトのURL（任意）</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('appUrl')"></i>
                        </label>
                        <InputText
                            id="public_url"
                            v-model="formData.url"
                            placeholder="公式サイトのURL"
                            class="w-full"
                        />
                        <Message v-if="errors?.url" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.url.join(', ') }}
                        </Message>
                    </div>

                    <div class="mb-4">
                        <label for="description" class="label-flex text-sm">
                            <span>アプリケーションの説明（任意）</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('appDesc')"></i>
                        </label>
                        <Textarea
                            inputId="description"
                            v-model="formData.description"
                            autoResize
                            :placeholder="`アプリケーションの説明等（${maxDescLength}文字以内）`"
                            rows="3"
                            :maxlength="maxDescLength"
                            @input="descLength = formData.description?.length ?? 0"
                        />
                        <Message v-if="errors?.description" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.description.join(', ') }}
                        </Message>
                    </div>

                    <div class="mb-4">
                        <label for="currency_unit" class="label-flex text-sm">
                            <span>通貨単位</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('currencyUnit')"></i>
                        </label>
                        <ComboBox
                            inputId="currency_unit"
                            :modelValue="formData.currency_unit"
                            @update:modelValue="val => formData.currency_unit = val ?? null"
                            :options="optionStore.currencyLabels"
                            placeholder="通貨単位"
                            emptyMessage="追加できます"
                            class="max-w-max"
                        />
                        <Message v-if="errors?.currency_unit" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.currency_unit.join(', ') }}
                        </Message>
                    </div>

                    <div v-if="false" class="mb-4">
                        <label for="app_image" class="label-flex text-sm">
                            <span>アプリケーション画像（任意）</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('appImage')" title=""></i>
                        </label>
                        <InputText
                            id="app_image"
                            __v-model="formData.image"
                            placeholder="アプリケーション画像"
                            class="w-full"
                        />
                        <Message v-if="errors?.image" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.image.join(', ') }}
                        </Message>
                    </div>

                    <div class="mb-4 md:mb-0">
                        <label for="date_update_time" class="label-flex text-sm">
                            <span>アプリケーション内の日付更新時間</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('dateUpdateTime')"></i>
                        </label>
                        <div class="flex justify-between items-center gap-2">
                            <CalendarUI
                                id="date_update_time"
                                v-model="rawDateUpdateTime"
                                :commit="false"
                                :timeOnly="true"
                                customIcon="🕒"
                                :pt="{ root: 'min-w-[8rem]! w-36' }"
                            />
                            <div class="w-max">
                                <ToggleSwitch
                                    inputId="sync_update_time"
                                    v-model="formData.sync_update_time"
                                    :disabled="!rawDateUpdateTime"
                                />
                            </div>
                            <label for="sync_update_time" class="flex-grow ml-1 pt-1 font-medium text-sm">日付更新時間とログ登録対象日を同期する</label>
                        </div>
                        <Message v-if="errors?.date_update_time" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.date_update_time.join(', ') }}
                        </Message>
                    </div>

                </Fieldset>
                <pre v-if="false" class="text-xs whitespace-pre-wrap">{{ formData }}</pre>
            </div>
            <div class="w-full md:w-1/2">
                <Fieldset legend="ログ記録用の設定">
                    <p v-if="true" class="lead mb-4">PullLogでのログ記録時に使用するアプリ内の設定情報や任意のマーカー等を定義できます。</p>

                    <div class="mb-4">
                        <label for="rarity_defs" class="label-flex text-sm">
                            <span>レアリティ定義（任意）</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('rarityDefs')"></i>
                        </label>
                        <InputOptions
                            v-if="formData?.rarity_defs"
                            inputId="rarity_defs"
                            v-model="formData.rarity_defs"
                            v-model:activeEmojiPickerId="activeEmojiPickerId"
                            placeholder="SR, ★5 など"
                            :maxItems="20"
                            :maxLength="10"
                            :helpText="true"
                            class="w-full"
                        />
                        <Message v-if="errors?.rarity_defs" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.rarity_defs.join(', ') }}
                        </Message>
                    </div>

                    <div class="mb-0">
                        <label for="marker_defs" class="label-flex text-sm">
                            <span>マーカー定義（任意）</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('markerDefs')"></i>
                        </label>
                        <InputOptions
                            v-if="formData?.marker_defs"
                            inputId="marker_defs"
                            v-model="formData.marker_defs"
                            v-model:activeEmojiPickerId="activeEmojiPickerId"
                            placeholder="ピックアップ,すり抜けなど"
                            :maxItems="20"
                            :maxLength="20"
                            :helpText="true"
                            class="w-full"
                        />
                        <Message v-if="errors?.marker_defs" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.marker_defs.join(', ') }}
                        </Message>
                    </div>

                </Fieldset>
            </div>
        </div>
        <template #closebutton>
            <Button
                icon="pi pi-times"
                class="dismiss-button"
                @click.prevent="emit('update:visible', false)"
                v-blur-on-click
            />
        </template>
        <template #footer>
            <div class="w-full flex justify-between items-center gap-4">
                <div class="flex-grow hidden md:block md:w-auto"></div>
                <Button
                    label="キャンセル"
                    class="w-1/2 md:w-56 btn btn-alternative"
                    @click="emit('update:visible', false)"
                    v-blur-on-click
                />
                <Button
                    label="保存"
                    class="w-1/2 md:w-56 btn btn-primary"
                    @click="handleSubmit"
                    :disabled="!isValidAll"
                    v-blur-on-click
                />
                <div class="flex-grow hidden md:block md:w-auto"></div>
            </div>
        </template>
    </Dialog>
</template>
