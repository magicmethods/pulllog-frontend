<script setup lang="ts">
import { z } from 'zod'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { Form } from '@primevue/forms'
import { useOptionStore } from '~/stores/useOptionStore'

// Types
type ValidateAppData = AppData & { raw_date_update_time: Date | null }

// Props/Emits
const props = defineProps<{
    visible: boolean
    app?: App
}>()
const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'submit', value: AppData): void
}>()

// Stores
const optionStore = useOptionStore()

// 初期化用ファクトリ
function createAppDataFromApp(app?: App): AppData {
    return {
        userId: 0, // TODO: ユーザーIDはセッション管理ストアから取得する
        name: app?.name ?? '',
        appId: app?.value ?? '',
        url: app?.url ?? '',
        description: '',
        currency_unit: null,
        date_update_time: '',
        sync_update_time: false,
        rarity_defs: [...optionStore.rarityOptions],
        marker_defs: [...optionStore.symbolOptions],
        task_defs: [],
    }
}

// Validation schema
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
const schema = z.object({
    userId: z.number().min(0).optional(), // 入力検証スキップ: セッションから取得・設定するため
    name: z.string().min(1, 'アプリケーション名は必須です'),
    url: z.string().url('URLの形式が不正です').optional().or(z.literal('')).nullable(),
    description: z.string().max(400, '400文字以内で入力してください').optional().or(z.literal('')).nullable(),
    currency_unit: z.string().optional().or(z.literal('')).nullable(),
    raw_date_update_time: z.instanceof(Date).refine(d => !Number.isNaN(d.getTime()), '無効な時間です').optional().or(z.literal('')).nullable(),
    sync_update_time: z.boolean().optional(),
    rarity_defs: z.any().optional(), // 入力検証スキップ: z.array(z.string()).optional(),
    marker_defs: z.any().optional(), // 入力検証スキップ: z.array(z.string()).optional(),
    task_defs: z.any().optional(), // 未実装
})
const initialValues = ref<ValidateAppData>({
    ...createAppDataFromApp(props.app),
    raw_date_update_time: null as Date | null,
})
const resolver = ref(zodResolver(schema))

// Refs & Local variables
const AppEditForm = ref<HTMLFormElement | null>(null)
const maxDescLength = 400
const descLength = ref<number>(0)
const tooltips = {
    appName:        'アプリ名はあなたが管理しやすい名称を自由に設定できます。<span class="tooltip-warning">※アプリ名は入力必須です</span>',
    appUrl:         '指定のURLからアイコン画像が自動取得されます。',
    appDesc:        `アプリケーションの説明等を自由に入力できます（${maxDescLength}文字以内）。`,
    appImage:       'あなたの好きな画像をこのアプリケーション用の画像として設定できます。この画像は指定URLから自動取得するアイコン画像よりも優先されます。',
    currencyUnit:   '対象のアプリケーションに課金する際に取り扱われる通貨単位を指定します。',
    dateUpdateTime: '対象のアプリケーションにおける日付が切り替わる時刻です。一般的にこの時間を跨ぐことでログイン日付が再計算されます。<br>設定した時刻はPullLogでのログ登録時の対象日付の更新時間に同期させることが可能です。',
    rarityDefs:     'アプリケーション内で使用されているレアリティの定義リストです。排出リストのレアリティオプションの初期リストとして使用されます。<br>排出リストの登録時に追加することもできます。',
    markerDefs:     'アプリケーション内で使用されているマーカーの定義リストです。排出リストのマーキングオプションの初期マーカーリストとして使用されます。<br>排出リストの登録時に追加することもできます。',
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
// 日付更新時間の入力を監視
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
onMounted(() => {
    console.log('AppEditModal::onMounted', initialValues.value)
})

// Watches
watch(
    () => props.app,
    val => {
        // 親からのprops変更を監視（初回マウント時も有効）
        console.log('AppEditModal::props.app changed', val)
        initialValues.value = {
            ...createAppDataFromApp(val),
            raw_date_update_time: new Date(new Date().setHours(0, 0, 0, 0)) as Date | null,
        }
        descLength.value = initialValues.value.description?.length ?? 0
    },
    { immediate: true }
)

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
                                __input="handleTimeInput"
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
            </div>
            <div class="flex flex-col gap-2 p-2 md:ml-2">
                <pre v-if="true" class="text-xs whitespace-pre-wrap">{{ $form }}</pre>
                <Fieldset legend="ログ記録用の設定">
                    <p v-if="false" class="lead">PullLogでのログ記録時に利用できるアプリの詳細情報を設定できます。</p>
                    <FormField v-slot="$field" name="rarity_defs">
                        <label for="rarity_defs" class="label-flex text-sm">
                            <span>レアリティ定義（任意）</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('rarityDefs')"></i>
                        </label>
                        <InputOptions
                            inputId="rarity_defs"
                            name="rarity_defs"
                            :modelValue="$field?.value"
                            placeholder="SSR, SR, ★5 など"
                            :defaultOptions="optionStore.rarityOptions"
                            :maxItems="10"
                            :maxLength="20"
                            :withPreview="true"
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
                            placeholder="ピックアップ, すり抜け など"
                            :defaultOptions="optionStore.symbolOptions"
                            :maxItems="10"
                            :maxLength="20"
                            :withPreview="true"
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
