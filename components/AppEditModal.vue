<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { z } from "zod"
import { useCurrencyStore } from "~/stores/useCurrencyStore"
import { useOptionStore } from "~/stores/useOptionStore"
import { useUserStore } from "~/stores/useUserStore"

// Props/Emits
const props = defineProps<{
    visible: boolean
    app?: AppData
}>()
const emit = defineEmits<{
    (e: "update:visible", value: boolean): void
    (e: "submit", value: AppData): void
}>()

// Stores etc.
const userStore = useUserStore()
const optionStore = useOptionStore()
const currencyStore = useCurrencyStore()
const { t, locale } = useI18n()

// Refs & Local variables
const rawDateUpdateTime = ref<Date | null>(null)
const formData = ref<AppData>({} as AppData) // 初期値は空のオブジェクト
const maxAppNameLength = computed(
    () => userStore.planLimits?.maxAppNameLength ?? 30,
)
const maxDescLength = computed(
    () => userStore.planLimits?.maxAppDescriptionLength ?? 400,
)
const descLength = ref<number>(0)
const activeEmojiPickerId = ref<string | null>(null)
const tooltips = computed(() => ({
    appName: t("component.tooltip.appName"),
    appUrl: t("component.tooltip.appUrl"),
    appDesc: t("component.tooltip.appDesc", { maxLength: maxDescLength.value }),
    appImage: t("component.tooltip.appImage"),
    currencyUnit: t("component.tooltip.currencyUnit"),
    dateUpdateTime: t("component.tooltip.dateUpdateTime"),
    pitySystem: t("component.tooltip.pitySystem"),
    rarityDefs: t("component.tooltip.rarityDefs"),
    markerDefs: t("component.tooltip.markerDefs"),
}))
// Validation schema
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
const schema = computed(() =>
    z.object({
        name: z
            .string()
            .min(1, t("validation.appNameRequired"))
            .max(
                maxAppNameLength.value,
                t("validation.appNameLengthExceeded", {
                    maxLength: maxAppNameLength.value,
                }),
            ),
        url: z
            .string()
            .url(t("validation.invalidURL"))
            .optional()
            .or(z.literal(""))
            .nullable(),
        description: z
            .string()
            .max(
                maxDescLength.value,
                t("validation.textLengthExceeded", {
                    maxLength: maxDescLength.value,
                }),
            )
            .optional()
            .or(z.literal(""))
            .nullable(),
        //currency_code: z.string().max(8, t('validation.textLengthExceeded', { maxLength: 8 })).optional().or(z.literal('')).nullable(),
        currency_code: z
            .string()
            .regex(/^[A-Z]{3}$/, t("validation.invalidCurrencyCode")),
        date_update_time: z
            .string()
            .regex(timeRegex, t("validation.invalidTime"))
            .optional()
            .or(z.literal(""))
            .nullable(),
        sync_update_time: z.boolean().optional(),
        pity_system: z.boolean().optional(),
        guarantee_count: z
            .number()
            .int()
            .min(0, t("validation.guaranteeCountMin"))
            .optional(),
        rarity_defs: z.any().optional(), // 入力検証スキップ
        marker_defs: z.any().optional(), // 入力検証スキップ
        task_defs: z.any().optional(), // 未実装
    }),
)

// Computed
const isShown = computed(() => props.visible ?? false)
const isEditMode = computed(() => props.app?.appId && props.app?.appId !== "")
const displayMode = computed(() =>
    isEditMode.value ? t("modal.appEdit.edit") : t("modal.appEdit.register"),
)
const isValidAll = computed(() => {
    // アプリ名が空でなく、全フィールドのバリデーションが正常かどうかをチェック
    return errors.value === null && formData.value?.name !== ""
})
const exampleAppName = computed(() => {
    const exampleApps = optionStore.exampleApps
    return `${t("modal.appEdit.appNamePlaceholder")}: ${exampleApps[Math.floor(Math.random() * exampleApps.length)]}`
})
//const currencyOptions = computed(() => optionStore.currencyLabels)
const currencyOptions = ref<CurrencyOption[]>([])
const currenciesReady = computed(() => currencyOptions.value.length > 0)

// Methods
// 初期化用ファクトリ
async function initCurrencies() {
    await currencyStore.ensureLoaded()
    currencyOptions.value = currencyStore.optionsForSelect(locale.value)
}
function createAppDataFromApp(app?: AppData): AppData {
    // 日付更新時間の初期値を設定
    if (app?.date_update_time) {
        const [hour, minute] = app.date_update_time.split(":").map(Number)
        rawDateUpdateTime.value = new Date(
            new Date().setHours(hour, minute, 0, 0),
        ) as Date | null
    } else {
        rawDateUpdateTime.value = new Date(
            new Date().setHours(0, 0, 0, 0),
        ) as Date | null
    }

    const defaultCode = currencyStore.defaultCurrencyCode(locale.value)
    const code =
        (app?.currency_code && currencyStore.get(app.currency_code)?.code) ||
        defaultCode

    // 新規登録（引数 app がない）時は InputOptions の初期値を設定
    const defaultRarityDefs = app?.rarity_defs ?? [...optionStore.rarityOptions]
    const defaultMarkerDefs = app?.marker_defs ?? [...optionStore.symbolOptions]

    const defaultAppData: AppData = {
        appId: app?.appId ?? "",
        name: app?.name ?? "",
        url: app?.url ?? "",
        description: app?.description ?? "",
        currency_code: code,
        date_update_time: app?.date_update_time ?? "",
        sync_update_time: app?.sync_update_time ?? false,
        pity_system: app?.pity_system ?? false,
        guarantee_count: app?.guarantee_count ?? 0,
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
        value: tooltips.value[key as keyof typeof tooltips.value] ?? "",
        escape: false,
        pt: {
            root: "pb-1",
            text: "w-max max-w-[20rem] p-3 bg-surface-600 text-white dark:bg-gray-800 dark:shadow-lg font-medium text-xs",
            arrow: "w-2 h-2 rotate-[45deg] border-b border-4 border-surface-600 dark:border-gray-800",
        },
    }
}
// TimePicker の日付値を HH:mm 形式に変換
function toTimeString(d: CalenderDate): string {
    if (!d || !(d instanceof Date)) return ""
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${hours}:${minutes}`
}
// フォームの値を検証
const errors = ref<Record<string, string[]> | null>(null)
function validateForm(): boolean {
    const code = formData.value.currency_code
    if (!code || !currencyStore.get(code)) {
        errors.value = {
            ...(errors.value ?? {}),
            currency_code: [t("validation.currencyCodeInvalid")],
        }
        return false
    }

    const result = schema.value.safeParse(formData.value)
    errors.value = result.success ? null : result.error.flatten().fieldErrors
    return result.success
}
// Submit ハンドラ
function handleSubmit() {
    if (!validateForm()) return
    // フォームの値が有効な場合、親コンポーネントの submit イベントを発火
    emit("submit", { ...formData.value })
    emit("update:visible", false)
}

// Watchers
watch(
    () => props.visible,
    async (val) => {
        // モーダルの表示状態を監視
        if (val) {
            // モーダルが表示されたときに初期値を設定
            await initCurrencies()
            formData.value = { ...createAppDataFromApp(props.app) }
            descLength.value = formData.value.description?.length ?? 0
            /*
        if (!isEditMode.value) {
            // 新規登録モードの場合は、初期値を設定
            formData.value.rarity_defs = [...optionStore.rarityOptions]
            formData.value.marker_defs = [...optionStore.symbolOptions]
        }
        */
        } else {
            // モーダルが非表示になったときに初期値をリセット
            formData.value = { ...createAppDataFromApp() }
            descLength.value = 0
        }
        //console.log(`AppEditModal: ${val ? 'shown' : 'hidden'} / mode: ${isEditMode.value ? 'edit' : 'register'}`, formData.value)
    },
    { immediate: true },
)
/*
watch(() => formData.value, (val) => {
    // フォーム値が変更されたらバリデーション実行
    validateForm()
}, { deep: true })
*/
watch(
    () => rawDateUpdateTime.value,
    (val) => {
        // 日付更新時間が変更されたら、rawDateUpdateTime を更新
        formData.value.date_update_time = val ? toTimeString(val) : ""
    },
    { immediate: true },
)
</script>

<template>
    <Dialog
        v-model:visible="isShown"
        :maximizable="true"
        modal
        id="appEditModal"
        :header="t('modal.appEdit.header', { mode: displayMode })"
        :dismissableMask="true"
        :blockScroll="true"
        :breakpoints="{ '960px': '80vw', '575px': '90vw' }"
        appendTo="self"
        :style="{ width: '80vw', height: '80vh' }"
    >
        <div class="flex flex-wrap lg:flex-nowrap justify-between items-start gap-4">

            <div class="w-full lg:w-1/2">
                <Fieldset :legend="t('modal.appEdit.basicInfo')">
                    <p v-if="false" class="lead">{{ t('modal.appEdit.basicInfoDescription') }}</p>
                    <div class="mb-4">
                        <label for="app_name" class="label-flex text-sm">
                            <span class="required">{{ t('modal.appEdit.appName') }}</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('appName')"></i>
                        </label>
                        <InputText
                            id="app_name"
                            v-model="formData.name"
                            :placeholder="exampleAppName"
                            class="w-full"
                        />
                        <Message v-if="errors?.name" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.name.join(', ') }}
                        </Message>
                    </div>

                    <div class="mb-4">
                        <label for="public_url" class="label-flex text-sm">
                            <span>{{ t('modal.appEdit.appUrl') }}</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('appUrl')"></i>
                        </label>
                        <InputText
                            id="public_url"
                            v-model="formData.url"
                            :placeholder="t('modal.appEdit.appUrlPlaceholder')"
                            class="w-full"
                            :maxlength="255"
                        />
                        <Message v-if="errors?.url" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.url.join(', ') }}
                        </Message>
                    </div>

                    <div class="mb-4">
                        <label for="description" class="label-flex text-sm">
                            <span>{{ t('modal.appEdit.appDescription') }}</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('appDesc')"></i>
                        </label>
                        <Textarea
                            inputId="description"
                            v-model="formData.description"
                            autoResize
                            :placeholder="t('modal.appEdit.appDescriptionPlaceholder', { maxLength: maxDescLength })"
                            rows="3"
                            :maxlength="maxDescLength"
                            @input="descLength = formData.description?.length ?? 0"
                        />
                        <Message size="small" severity="secondary" variant="simple" class="text-surface dark:text-gray-500">
                            {{ t('modal.appEdit.inputCharacterCount') }}: {{ descLength }}</Message>
                        <Message v-if="errors?.description" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.description.join(', ') }}
                        </Message>
                    </div>

                    <div class="mb-4">
                        <label for="currency_code" class="label-flex text-sm">
                            <span>{{ t('modal.appEdit.currencyUnit') }}</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('currencyUnit')"></i>
                        </label>
                        <Select
                            labelId="currency_code"
                            :modelValue="formData.currency_code"
                            @update:modelValue="(val: string) => formData.currency_code = val"
                            :options="currencyOptions"
                            optionLabel="label"
                            optionValue="value"
                            :filter="true"
                            :editable="false"
                            :forceSelection="true"
                            :placeholder="t('modal.appEdit.currencyUnitPlaceholder')"
                            :emptyMessage="t('modal.appEdit.currencyUnitEmptyMessage')"
                            highlightOnSelect
                            class="min-w-max max-w-full md:max-w-3/4"
                            :disabled="!currenciesReady"
                            :pt="{
                                pcFilterContainer: { root: 'py-2 px-4' },
                                pcFilter: { root: 'w-full text-sm' },
                                pcFilterIconContainer: { root: '-mt-1 mr-4' },
                                filterIcon: '-mt-1',
                            }"
                        />
                        <Message v-if="errors?.currency_code" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.currency_code.join(', ') }}
                        </Message>
                    </div>

                    <div v-if="false" class="mb-4">
                        <label for="app_image" class="label-flex text-sm">
                            <span>{{ t('modal.appEdit.appImage') }}</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('appImage')" title=""></i>
                        </label>
                        <InputText
                            id="app_image"
                            __v-model="formData.image"
                            :placeholder="t('modal.appEdit.appImagePlaceholder')"
                            class="w-full"
                        />
                        <Message v-if="errors?.image" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.image.join(', ') }}
                        </Message>
                    </div>

                    <div class="mb-4">
                        <label for="date_update_time" class="label-flex text-sm">
                            <span>{{ t('modal.appEdit.dateUpdateTime') }}</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('dateUpdateTime')"></i>
                        </label>
                        <div class="flex flex-wrap md:flex-nowrap justify-between items-center gap-2">
                            <CalendarUI
                                id="date_update_time"
                                v-model="rawDateUpdateTime"
                                :commit="false"
                                :timeOnly="true"
                                customIcon="🕒"
                                :pt="{ root: 'min-w-[8rem]! w-36' }"
                            />
                            <div class="flex-grow flex items-center gap-2">
                                <div class="w-max flex items-center">
                                    <ToggleSwitch
                                        inputId="sync_update_time"
                                        v-model="formData.sync_update_time"
                                        :disabled="!rawDateUpdateTime"
                                    />
                                </div>
                                <label for="sync_update_time" class="flex-grow ml-1 pt-1 font-medium text-sm mb-0">{{ t('modal.appEdit.dateUpdateTimeSync') }}</label>
                            </div>
                        </div>
                        <Message v-if="errors?.date_update_time" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.date_update_time.join(', ') }}
                        </Message>
                    </div>

                    <div class="mb-4 md:mb-0">
                        <label for="date_update_time" class="label-flex text-sm">
                            <span>{{ t('modal.appEdit.pitySystem') }}</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('pitySystem')"></i>
                        </label>
                        <div class="flex flex-wrap md:flex-nowrap justify-between items-center gap-2">
                            <div class="flex-grow flex items-center gap-2 pr-2">
                                <div class="w-max flex items-center">
                                    <ToggleSwitch
                                        inputId="pity_system"
                                        v-model="formData.pity_system"
                                        @change="() => formData.guarantee_count = 0"
                                    />
                                </div>
                                <label for="pity_system" class="w-max ml-1 pt-1 font-medium text-sm mb-0">
                                    {{ t('modal.appEdit.pitySystemLabel') }}<strong :class="['ml-0.5',
                                        formData.pity_system ? 'text-amber-500 dark:text-yellow-400' : '']"
                                    >{{ formData.pity_system ? t('modal.appEdit.pitySystemEnabled') : t('modal.appEdit.pitySystemDisabled') }}</strong>
                                </label>
                            </div>
                            <div class="flex-grow w-max flex items-center gap-3">

                                <InputNumber
                                    v-model="formData.guarantee_count"
                                    inputId="guarantee_count"
                                    :placeholder="t('modal.appEdit.guaranteeCountPlaceholder')"
                                    showButtons
                                    :min="1"
                                    :disabled="!formData.pity_system"
                                    class="input-number-sm flex-grow md:flex-grow-0"
                                />
                                <Button
                                    icon="pi pi-plus"
                                    label="10"
                                    class="btn btn-alternative p-2! text-base! m-0!"
                                    @click="() => formData.guarantee_count ? (formData.guarantee_count += 10) : (formData.guarantee_count = 10)"
                                    :disabled="!formData.pity_system"
                                    v-blur-on-click
                                />
                                <Button
                                    icon="pi pi-plus"
                                    label="100"
                                    class="btn btn-alternative p-2! text-base! m-0!"
                                    @click="() => formData.guarantee_count ? (formData.guarantee_count += 100) : (formData.guarantee_count = 100)"
                                    :disabled="!formData.pity_system"
                                    v-blur-on-click
                                />
                                <Button
                                    icon="pi pi-eraser"
                                    label="0"
                                    class="btn btn-alternative p-2! text-base! m-0!"
                                    :disabled="!formData.pity_system || formData.guarantee_count === 0"
                                    @click="formData.guarantee_count = 0"
                                    v-blur-on-click
                                />
                            </div>
                        </div>
                        <Message v-if="errors?.guarantee_count" severity="error" size="small" variant="simple" class="mt-1">
                            {{ errors?.guarantee_count.join(', ') }}
                        </Message>
                    </div>

                </Fieldset>
                <pre v-if="false" class="text-xs whitespace-pre-wrap">{{ formData }}</pre>
            </div>
            <div class="w-full lg:w-1/2">
                <Fieldset :legend="t('modal.appEdit.loggingSettings')">
                    <p v-if="true" class="lead mb-4">{{ t('modal.appEdit.loggingSettingsDescription') }}</p>

                    <div class="mb-4">
                        <label for="rarity_defs" class="label-flex text-sm">
                            <span>{{ t('modal.appEdit.rarityDefinitions') }}</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('rarityDefs')"></i>
                        </label>
                        <InputOptions
                            v-if="formData?.rarity_defs"
                            inputId="rarity_defs"
                            v-model="formData.rarity_defs"
                            v-model:activeEmojiPickerId="activeEmojiPickerId"
                            :placeholder="t('modal.appEdit.rarityDefinitionsPlaceholder')"
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
                            <span>{{ t('modal.appEdit.markerDefinitions') }}</span>
                            <i class="pi pi-question-circle helper-icon" v-tooltip.top="showTooltip('markerDefs')"></i>
                        </label>
                        <InputOptions
                            v-if="formData?.marker_defs"
                            inputId="marker_defs"
                            v-model="formData.marker_defs"
                            v-model:activeEmojiPickerId="activeEmojiPickerId"
                            :placeholder="t('modal.appEdit.markerDefinitionsPlaceholder')"
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
                    :label="t('modal.appEdit.cancel')"
                    class="w-1/2 md:w-56 btn btn-alternative"
                    @click="emit('update:visible', false)"
                    v-blur-on-click
                />
                <Button
                    :label="t('modal.appEdit.save')"
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
