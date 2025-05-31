<script setup lang="ts">
import { z } from 'zod'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { Form } from '@primevue/forms'
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

// 初期化用ファクトリ
function createAppDataFromApp(app?: AppData): ValidateAppData {
    // 通貨単位の初期値を設定
    const matchCurrencyUnit = optionStore.currencyOptions.filter(o => o.value === app?.currency_unit).map(o => o.desc ? o.desc : o.label)
    const currencyUnit = matchCurrencyUnit.length > 0 ? matchCurrencyUnit[0] : app?.currency_unit ?? null
    // 日付更新時間の初期値を設定
    let rawDateUpdateTime = null
    if (app?.date_update_time) {
        const [hour, minute] = app.date_update_time.split(':').map(Number)
        rawDateUpdateTime = new Date(new Date().setHours(hour, minute, 0, 0)) as Date | null
    } else {
        rawDateUpdateTime = new Date(new Date().setHours(0, 0, 0, 0)) as Date | null
    }
    // 新規登録（引数 app がない）時の初期値を設定
    let defaultRarityDefs = app?.rarity_defs ?? []
    let defaultMarkerDefs = app?.marker_defs ?? []
    if (!app) {
        defaultRarityDefs = [...optionStore.rarityOptions]
        defaultMarkerDefs = [...optionStore.symbolOptions]
    }
    const defaultAppData = {
        //userId: 0, // TODO: ユーザーIDはセッション管理ストアから取得する
        appId: app?.appId ?? '',
        name: app?.name ?? '',
        url: app?.url ?? '',
        description: app?.description ?? '',
        currency_unit: currencyUnit,
        date_update_time: app?.date_update_time ?? '',
        raw_date_update_time: rawDateUpdateTime,
        sync_update_time: app?.sync_update_time ?? false,
        rarity_defs: defaultRarityDefs,
        marker_defs: defaultMarkerDefs,
        task_defs: app?.task_defs ?? [],
    }
    console.log('AppEditModal::createAppDataFromApp:', app, defaultAppData)
    return defaultAppData
}

// Validation schema
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
const schema = z.object({
    //userId: z.number().min(0).optional(), // 入力検証スキップ: セッションから取得・設定するため
    name: z.string().min(1, 'アプリケーション名は必須です'),
    url: z.string().url('URLの形式が不正です').optional().or(z.literal('')).nullable(),
    description: z.string().max(400, '400文字以内で入力してください').optional().or(z.literal('')).nullable(),
    currency_unit: z.string().optional().or(z.literal('')).nullable(),
    date_update_time: z.string().regex(timeRegex, '無効な時間です').optional().or(z.literal('')).nullable(),
    //raw_date_update_time: z.instanceof(Date).refine(d => !Number.isNaN(d.getTime()), '無効な時間です').optional().or(z.literal('')).nullable(),
    raw_date_update_time: z.any().optional(), // 時刻の入力値は Date 型ではなく、文字列型で受け取るため、zod の検証をスキップする
    sync_update_time: z.boolean().optional(),
    rarity_defs: z.any().optional(), // 入力検証スキップ: z.array(z.string()).optional(),
    marker_defs: z.any().optional(), // 入力検証スキップ: z.array(z.string()).optional(),
    //task_defs: z.any().optional(), // 未実装
})
const initialValues = ref<ValidateAppData>({...createAppDataFromApp(props.app)})
const resolver = ref(zodResolver(schema))

// Refs & Local variables
const AppEditForm = ref<HTMLFormElement | null>(null)
const maxDescLength = 400
const descLength = ref<number>(0)
const activeEmojiPickerId = ref<string | null>(null)
const tooltips = {
    appName:        'アプリ名はあなたが管理しやすい名称を自由に設定できます。<span class="tooltip-warning">※アプリ名は入力必須です</span>',
    appUrl:         '指定のURLからアイコン画像が自動取得されます。',
    appDesc:        `アプリケーションの説明等を自由に入力できます（${maxDescLength}文字以内）。`,
    appImage:       'あなたの好きな画像をこのアプリケーション用の画像として設定できます。この画像は指定URLから自動取得するアイコン画像よりも優先されます。',
    currencyUnit:   '対象のアプリケーションに課金する際に取り扱われる通貨単位を指定します。',
    dateUpdateTime: '対象のアプリケーションにおける日付が切り替わる時刻です。一般的にこの時間を跨ぐことでログイン日付が再計算されます。<br>設定した時刻はPullLogでのログ登録時の対象日付の更新時間に同期させることが可能です。',
    rarityDefs:     'アプリケーション内で使用されているレアリティの定義リストです。排出リストのレアリティオプションの初期リストとして使用されます。<br>排出リストの登録時に追加することもできますが、その場合はこの定義リストは更新されません。<br>永続的に使用する際はこの定義リストを設定することをお勧めします。',
    markerDefs:     'PullLogの排出リストのログ記録時に任意にマーキングを行うためのマーカーの定義リストです。排出リストのマーキングオプションの初期マーカーリストとして使用されます。<br>排出リストの登録時に追加することもできますが、その場合はこの定義リストは更新されません。<br>永続的に使用する際はこの定義リストを設定することをお勧めします。',
}

// Computed
const isEditMode = computed(() => initialValues.value?.appId && initialValues.value?.appId !== '')
const isValidAll = computed(() => {
    // アプリ名が空でなく、全フィールドの Validation が Ok かどうかをチェック
    return AppEditForm.value?.valid && AppEditForm.value?.fields.name?.states.value !== ''
})

// Methods
// ツールチップを表示する
function showTooltip(key: string) {
    return {
        value: tooltips[key as keyof typeof tooltips] ?? '',
        escape: false,
        pt: {
            root: 'pb-1',
            text: 'w-max max-w-[20rem] p-3 bg-surface-600 text-white dark:bg-gray-700 font-medium text-xs',
            arrow: 'w-2 h-2 rotate-[45deg] border-b border-4 border-surface-600 dark:border-gray-700',
        }
    }
}
// TimePicker の日付値を HH:mm 形式に変換
const toTimeString = (d: CalenderDate): string => {
    if (!d || !(d instanceof Date)) return ''
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
// biome-ignore lint:/suspicious/noExplicitAny
const onFormSubmit = ({ valid, errors, values }: any) => {
    // arguments: { originalEvent: SubmitEvent, valid: boolean, values?: ValidateAppData, errors?: any, reset: () => void, states:any }
    console.log('AppEditModal::onFormSubmit?', valid, errors, values)
    if (!valid || Object.keys(errors).length > 0 || !values) {
        console.warn('Validation Error:', errors)
        return
    }
    const commitValues = {
        ...values,
        date_update_time: toTimeString(values.raw_date_update_time),
    }
    console.log('AppEditModal::commitValues', commitValues)
    // コミット値を親へ emit してモーダルを閉じる
    emit('submit', commitValues)
    emit('update:visible', false)
}

// Lifecycle Hooks
/*
onMounted(() => {
    console.log('AppEditModal::onMounted', initialValues.value)
})
*/

// Watchers
watch(
    () => props.visible,
    val => {
        // モーダルの表示状態を監視
        if (val) {
            // モーダルが表示されたときに初期値を設定
            initialValues.value = {...createAppDataFromApp(props.app)}
            descLength.value = initialValues.value.description?.length ?? 0
            if (!isEditMode.value) {
                // 新規登録モードの場合は、初期値を設定
                initialValues.value.rarity_defs = [...optionStore.rarityOptions]
                initialValues.value.marker_defs = [...optionStore.symbolOptions]
            }
        } else {
            // モーダルが非表示になったときに初期値をリセット
            initialValues.value = {...createAppDataFromApp()}
            descLength.value = 0
        }
        console.log(`AppEditModal: ${val ? 'shown' : 'hidden'} / mode: ${isEditMode.value ? 'edit' : 'register'}`, initialValues.value)
    },
    { immediate: false }
)
/*
watch(
    () => props.app,
    val => {
        // 親からのprops変更を監視（初回マウント時も有効）
        console.log('AppEditModal::props.app changed', val)
        initialValues.value = {
            ...createAppDataFromApp(val),
            raw_date_update_time: new Date(new Date().setHours(0, 0, 0, 0)) as Date | null,
        }
        if (!val) {
            // 初期値を設定
            if (initialValues.value.rarity_defs.length === 0) {
                initialValues.value.rarity_defs = [...optionStore.rarityOptions]
            }
            if (initialValues.value.marker_defs.length === 0) {
                initialValues.value.marker_defs = [...optionStore.symbolOptions]
            }
        }
        descLength.value = initialValues.value.description?.length ?? 0
    },
    { immediate: true }
)
*/
</script>

<template>
    <Dialog
        v-model:visible="props.visible"
        :maximizable="true"
        modal
        :header="`アプリケーションの${isEditMode ? '設定編集' : '新規追加'}`"
        :dismissableMask="true"
        :blockScroll="true"
        :breakpoints="{ '960px': '80vw', '575px': '90vw' }"
        appendTo="self"
        :style="{ width: '80vw', height: '80vh' }"
    >
        <Form
            ref="AppEditForm"
            v-slot="$form"
            :initialValues
            :resolver
            @submit="onFormSubmit"
            class="grid grid-cols-2 space-y-4"
        >
            <div class="flex flex-col gap-2 p-2 md:mr-2">
                <Fieldset legend="アプリケーションの基本情報">
                    <p v-if="false" class="lead">PullLogで取り扱うアプリケーションの登録内容を設定します。</p>
                    <FormField v-slot="$field" name="name">
                        <label for="app_name" class="label-flex text-sm">
                            <span class="required">アプリケ―ション名</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('appName')"></i>
                        </label>
                        <InputText
                            id="app_name"
                            name="name"
                            placeholder="例: FGO"
                            class="w-full"
                        />
                        <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                    </FormField>
                    <FormField v-slot="$field" name="url">
                        <label for="piblic_url" class="label-flex text-sm">
                            <span>公式サイトのURL（任意）</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('appUrl')"></i>
                        </label>
                        <InputText
                            id="public_url"
                            name="url"
                            placeholder="公式サイトのURL"
                            class="w-full"
                        />
                        <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                    </FormField>
                    <FormField v-slot="$field" name="description">
                        <label for="description" class="label-flex text-sm">
                            <span>アプリケーションの説明（任意）</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('appDesc')"></i>
                        </label>
                        <Textarea
                            inputId="description"
                            name="description"
                            autoResize
                            :placeholder="`アプリケーションの説明等（${maxDescLength}文字以内）`"
                            rows="3"
                            :maxlength="maxDescLength"
                            @input="descLength = $field?.value.length ?? 0"
                        />
                        <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                    </FormField>
                    <FormField v-slot="$field" name="currency_unit">
                        <label for="currency_unit" class="label-flex text-sm">
                            <span>通貨単位</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('currencyUnit')"></i>
                        </label>
                        <ComboBox
                            inputId="currency_unit"
                            name="currency_unit"
                            :modelValue="$field?.value"
                            :options="optionStore.currencyLabels"
                            __update:options="(val) => optionStore.currencyLabels = val"
                            placeholder="通貨単位"
                            emptyMessage="追加できます"
                            class="max-w-max"
                        />
                        <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                    </FormField>
                    <FormField v-if="false" v-slot="$field" name="app_image">
                        <label for="app_image" class="label-flex text-sm">
                            <span>アプリケーション画像（任意）</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('appImage')" title=""></i>
                        </label>
                        <InputText
                            id="app_image"
                            name="app_image"
                            placeholder="アプリケーション画像"
                            class="w-full"
                        />
                        <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                    </FormField>
                    <FormField v-slot="$field" name="raw_date_update_time">
                        <label for="date_update_time" class="label-flex text-sm">
                            <span>アプリケーション内の日付更新時間</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('dateUpdateTime')"></i>
                        </label>
                        <div class="flex justify-start items-center gap-2">
                            <CalendarUI
                                id="date_update_time"
                                name="raw_date_update_time"
                                :modelValue="$field?.value"
                                :commit="false"
                                :timeOnly="true"
                                customIcon="🕒"
                                :pt="{ root: 'min-w-[8rem]! w-36' }"
                            />
                            <ToggleSwitch
                                inputId="sync_update_time"
                                name="sync_update_time"
                                :modelValue="$form.sync_update_time?.value"
                                :disabled="!$field?.value"
                            />
                            <label for="sync_update_time" class="flex-grow ml-1 pt-1 font-medium text-sm">日付更新時間とログ登録対象日を同期する</label>
                        </div>
                        <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                    </FormField>
                </Fieldset>
                <pre v-if="true" class="text-xs whitespace-pre-wrap">{{ $form }}</pre>
            </div>
            <div class="flex flex-col gap-2 p-2 md:ml-2">
                <Fieldset legend="ログ記録用の設定">
                    <p v-if="true" class="lead mb-4">PullLogでのログ記録時に使用するアプリ内の設定情報や任意のマーカー等を定義できます。</p>
                    <FormField v-slot="$field" name="rarity_defs">
                        <label for="rarity_defs" class="label-flex text-sm">
                            <span>レアリティ定義（任意）</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('rarityDefs')"></i>
                        </label>
                        <InputOptions
                            inputId="rarity_defs"
                            :modelValue="$field.value"
                            @update:modelValue="(val) => {
                                //nextTick(() => {
                                    //initialValues.rarity_defs = [...val]
                                    //$field.value = val
                                    $form.rarity_defs.value = val
                                    console.log('Check value:', $form, $field, val, initialValues.rarity_defs)
                                //})
                            }"
                            v-model:activeEmojiPickerId="activeEmojiPickerId"
                            placeholder="SR, ★5 など"
                            :maxItems="20"
                            :maxLength="10"
                            :withPreview="true"
                            :helpText="true"
                            class="w-full"
                        />
                        <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                    </FormField>
                    <FormField v-slot="$field" name="marker_defs">
                        <label for="marker_defs" class="label-flex text-sm">
                            <span>マーカー定義（任意）</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('markerDefs')"></i>
                        </label>
                        <InputOptions
                            inputId="marker_defs"
                            name="marker_defs"
                            :modelValue="$field?.value"
                            v-model:activeEmojiPickerId="activeEmojiPickerId"
                            placeholder="ピックアップ,すり抜けなど"
                            :maxItems="20"
                            :maxLength="20"
                            :withPreview="true"
                            :helpText="true"
                            class="w-full"
                        />
                        <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                    </FormField>
                </Fieldset>
            </div>
        </Form>
        <template #closebutton>
            <Button
                icon="pi pi-times"
                class="dismiss-button"
                @click.prevent="emit('update:visible', false)"
                v-blur-on-click
            />
        </template>
        <template #footer>
            <div class="mx-auto flex justify-center items-center gap-4">
                <div class="w-auto"></div>
                <Button
                    label="キャンセル"
                    class="w-56 btn btn-alternative"
                    @click.prevent="emit('update:visible', false)"
                    v-blur-on-click
                />
                <Button
                    label="保存"
                    class="w-56 btn btn-primary"
                    @click.prevent="AppEditForm?.submit()"
                    :disabled="!isValidAll"
                    v-blur-on-click
                />
                <div class="w-auto"></div>
            </div>
        </template>
    </Dialog>
</template>
