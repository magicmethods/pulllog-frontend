<script setup lang="ts">
import type {
    DatePickerPassThroughOptions,
    PrimeVueLocaleOptions,
} from "primevue"
import { useI18n } from "vue-i18n"
import { useUserStore } from "~/stores/useUserStore"

// Props & Emits
const props = defineProps<{
    modelValue: CalenderDate
    id?: string
    name?: string
    label?: string
    commit?: boolean
    commitLabel?: string
    commitDisabled?: boolean
    defaultDate?: Date
    minDate?: Date
    maxDate?: Date
    timeOnly?: boolean
    customIcon?: string
    withFooter?: boolean
    pt?: PassThroughValue
    containerClass?: string
    containerStyle?: string
    placeholder?: string
    disabled?: boolean
}>()
const emit = defineEmits<{
    (e: "update:modelValue", value: CalenderDate): void
    (e: "commit", value: CalenderDate): void
}>()

// Stores & i18n
const userStore = useUserStore()
const { t, locale } = useI18n()
const primevue = usePrimeVue()

// Ref & State
const internalDate = ref<CalenderDate>(null)
const passThroughOptions = computed(() => {
    return (props.pt ? { ...props.pt } : {}) as DatePickerPassThroughOptions
})
const localeValues = computed(() => ({
    today: t("calendar.today"),
    clear: t("calendar.clear"),
    dayNames: [
        t("calendar.sunday"),
        t("calendar.monday"),
        t("calendar.tuesday"),
        t("calendar.wednesday"),
        t("calendar.thursday"),
        t("calendar.friday"),
        t("calendar.saturday"),
    ],
    dayNamesShort: [
        t("calendar.short.sun"),
        t("calendar.short.mon"),
        t("calendar.short.tue"),
        t("calendar.short.wed"),
        t("calendar.short.thu"),
        t("calendar.short.fri"),
        t("calendar.short.sat"),
    ],
    dayNamesMin: [
        t("calendar.min.sun"),
        t("calendar.min.mon"),
        t("calendar.min.tue"),
        t("calendar.min.wed"),
        t("calendar.min.thu"),
        t("calendar.min.fri"),
        t("calendar.min.sat"),
    ],
    monthNames: [
        t("calendar.january"),
        t("calendar.february"),
        t("calendar.march"),
        t("calendar.april"),
        t("calendar.may"),
        t("calendar.june"),
        t("calendar.july"),
        t("calendar.august"),
        t("calendar.september"),
        t("calendar.october"),
        t("calendar.november"),
        t("calendar.december"),
    ],
    monthNamesShort: [
        t("calendar.short.jan"),
        t("calendar.short.feb"),
        t("calendar.short.mar"),
        t("calendar.short.apr"),
        t("calendar.short.may"),
        t("calendar.short.jun"),
        t("calendar.short.jul"),
        t("calendar.short.aug"),
        t("calendar.short.sep"),
        t("calendar.short.oct"),
        t("calendar.short.nov"),
        t("calendar.short.dec"),
    ],
    weekHeader: t("calendar.weekHeader"),
    chooseYear: t("calendar.chooseYear"),
    chooseMonth: t("calendar.chooseMonth"),
    chooseDate: t("calendar.chooseDate"),
    prevDecade: t("calendar.prevDecade"),
    nextDecade: t("calendar.nextDecade"),
    prevYear: t("calendar.prevYear"),
    nextYear: t("calendar.nextYear"),
    prevMonth: t("calendar.prevMonth"),
    nextMonth: t("calendar.nextMonth"),
    firstDayOfWeek: locale.value === "ja" ? 0 : 1, // 週開始日: 0=日曜, 1=月曜
}))

// Methods
function setLocale() {
    if (!primevue.config.locale) return
    primevue.config.locale = {
        ...primevue.config.locale,
        ...localeValues.value,
    } as PrimeVueLocaleOptions
}
function commitValue() {
    if (internalDate.value !== null) {
        emit("update:modelValue", internalDate.value)
        emit("commit", internalDate.value)
    }
}

// Lifecycle Hooks
onMounted(() => {
    setLocale()
    // 初期値の設定
    internalDate.value = props.modelValue ?? props.defaultDate ?? null
    // マウント時に初期コミット
    if (!props.commit) {
        commitValue()
    }
})

// Watches
watch(
    () => props.modelValue,
    (val) => {
        // props.modelValue（親） → internalDate（子）へ反映
        if (val !== internalDate.value) internalDate.value = val
    },
)
watch(
    () => internalDate.value,
    (val) => {
        // internalDate（子） → modelValue（親）へ反映
        if (props.commit) return // commit が true の場合は emit しない
        if (val === null || val === props.modelValue) return // null または modelValue と同じ場合は emit しない
        emit("update:modelValue", val)
        emit("commit", val)
    },
)
watch(
    () => locale.value, // userStore.user?.language,
    (newLang, prevLang) => {
        //console.log('CalendarUI: Language changed from', prevLang, 'to', newLang)
        setLocale()
    },
)
</script>

<template>
    <div :class="props.containerClass" :style="props.containerStyle">
        <h3 v-if="props.label" :for="props.id ?? 'calendar-date'">{{ props.label }}</h3>
        <div class="flex justify-start items-center gap-2 w-full">
            <DatePicker
                v-model="internalDate"
                :id="props.id ?? 'calendar-date'"
                :name="props.name ?? 'calendar_date'"
                showIcon
                :showButtonBar="props.timeOnly ? false : props.withFooter"
                iconDisplay="input"
                :defaultValue="props.timeOnly ? null : props.defaultDate"
                :minDate="props.timeOnly ? undefined : props.minDate"
                :maxDate="props.timeOnly ? undefined : props.maxDate"
                :timeOnly="props.timeOnly ?? false"
                :manualInput="!props.timeOnly"
                :dateFormat="props.timeOnly ? undefined : 'yy-mm-dd'"
                :placeholder="props.placeholder ?? (props.timeOnly ? 'HH:MM' : 'YYYY-MM-DD')"
                :disabled="props.disabled ?? false"
                :pt="passThroughOptions"
            >
                <template #inputicon="slotProps">
                    <span v-if="props.customIcon" @click="slotProps.clickCallback">{{ props.customIcon }}</span>
                </template>
            </DatePicker>
            <Button
                v-if="props.commit"
                :label="props.commitLabel ?? 'Commit'"
                class="btn btn-primary flex-1 w-full md:w-max max-w-1/2 md:max-w-1/2 px-4 py-2 text-base! m-0!"
                :disabled="!internalDate || (props.commitDisabled ?? false)"
                @click="commitValue"
                v-blur-on-click
            />
        </div>
    </div>
</template>