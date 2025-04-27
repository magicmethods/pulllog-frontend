<script setup lang="ts">

// Props
const props = defineProps<{
    visible: boolean
    app?: App
}>()

// Emits
const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'submit', value: Record<string, string>): void
}>()

// Refs & Local variables
const localApp = ref(
    props.app ? { ...props.app } : { name: '', value: '', url: '' }
)
const appDescription = ref<string>('')
const maxDescLength = 400
const descLength = ref<number>(0)
const currencyOptions = ref<string[]>(['JPY', 'USD', 'EUR', 'CNY']) // 通貨単位候補
const currencyUnit = ref<string>(currencyOptions.value[0])

// Computed
const isEditMode = computed(() => !!localApp.value?.value)
const dateUpdateTime = computed(() => {
    /*
    if (localApp.value?.date_update_time) {
        return new Date(localApp.value.date_update_time)
    }
    */
    return new Date(new Date().setHours(0, 0, 0, 0))
})

// Methods
function onFormSubmit() {
    console.log('AppEditModal: onFormSubmit', localApp.value)
    //emit('submit', localApp.value)
    //emit('update:visible', false)
}

// Watches
watch(
    () => props.app,
    val => {
        console.log('AppEditModal: props.app changed', val)
        localApp.value = val ? { ...val } : { name: '', value: '', url: '' }
    },
    { immediate: false }
)

// Pass Through
const modalPT = {
    root: {
        class: 'rounded-lg border border-surface bg-surface-50 dark:bg-gray-950 dark:border-gray-700',
        style: { width: '75vw', height: '75vh' }
    },
    header: 'p-3 border-b border-surface dark:border-gray-700',
    title: '',
    pcmaximizebutton: { root: 'h-8 w-8 p-1 rounded-full hover:bg-surface-200/50' },
    pcclosebutton: { class: 'h-8 w-8 p-1 rounded-full hover:bg-surface-200/50 dark:hover:bg-gray-800/40' },
    content: 'flex-grow p-3 overflow-auto dark:bg-gray-900/30',
    footer: 'p-3 pb-2 border-t border-surface dark:border-gray-700',
    mask: { class: 'backdrop-blur-sm' },
}
const textFieldPT = {
    root: 'w-full border border-surface-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200/50 dark:bg-gray-950 dark:border-gray-700 dark:focus:ring-primary-800/40'
}
const textareaPT = {
  root: 'w-full border border-surface-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200/50 dark:bg-gray-950 dark:border-gray-700 dark:focus:ring-primary-800/40 text-antialiasing text-sm'
}

</script>

<template>
    <Dialog
        v-model:visible="props.visible"
        :maximizable="false"
        modal
        :header="`アプリケーションの${isEditMode? '設定編集' : '新規追加'}`"
        :closable="true"
        :dismissableMask="true"
        :blockScroll="true"
        :breakpoints="{ '960px': '75vw', '575px': '90vw' }"
        appendTo="self"
        :pt="modalPT"
    >
        <Form
            v-slot="$form"
            __initialValues
            __resolver
            @submit="onFormSubmit"
            class="grid grid-cols-2 space-y-4"
        >
            <div class="flex flex-col gap-2 p-2 md:mr-2">
                <h3 class="text-primary-600 dark:text-primary-500 mb-1 font-semibold">アプリケーションの基本情報設定</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">PullLogで取り扱うアプリケーションの登録内容を設定します。</p>
                <FormField v-slot="$field" name="app_name" initialValue="" class="w-full flex flex-col gap-1 mb-2">
                    <label for="app_name" class="flex items-center text-sm font-semibold">
                        <span class="required">アプリケ―ション名</span>
                        <i class="pi pi-question-circle text-surface-500 dark:text-gray-400 text-sm mx-2" title="アプリ名はあなたが管理しやすい名称を自由に設定できます。"></i>
                    </label>
                    <InputText id="app_name" v-model="localApp.name" placeholder="アプケ―ション名" class="w-full" :pt="textFieldPT" />
                    <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                </FormField>
                <InputText type="hidden" id="appid" v-model="localApp.value" />
                <FormField v-slot="$field" name="public_url" initialValue="" class="flex flex-col gap-1 mb-2">
                    <label for="piblic_url" class="flex items-center text-sm font-semibold">
                        <span>公式サイトのURL（任意）</span>
                        <i class="pi pi-question-circle text-surface-500 dark:text-gray-400 text-sm mx-2" title="指定のURLからアイコン画像が自動取得されます。"></i>
                    </label>
                    <InputText id="public_url" v-model="localApp.url" placeholder="公式サイトのURL" class="w-full" :pt="textFieldPT" />
                    <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                </FormField>
                <FormField v-slot="$field" name="description" initialValue="" class="flex flex-col gap-1 mb-2">
                    <label for="description" class="flex items-center text-sm font-semibold">
                        <span>アプリケーションの説明（任意）</span>
                    </label>
                    <Textarea
                        v-model="appDescription"
                        inputId="description"
                        autoResize
                        :placeholder="`アプリケーションの説明等（${maxDescLength}文字以内）`"
                        rows="3"
                        :maxlength="maxDescLength"
                        @input="descLength = appDescription.length"
                        :pt="textareaPT"
                    />
                    <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                </FormField>
                <FormField v-slot="$field" name="currency_unit" initialValue="" class="flex flex-col gap-1 mb-2">
                    <label for="currency_unit" class="flex items-center text-sm font-semibold">
                        <span>通貨単位</span>
                        <i class="pi pi-question-circle text-surface-500 dark:text-gray-400 text-sm mx-2" title="このアプリケーションに課金する際に取り扱われる通貨単位を指定します。"></i>
                    </label>
                    <ComboBox
                        v-model="currencyUnit"
                        inputId="currency_unit"
                        :options="currencyOptions"
                        @update:options="(val) => currencyOptions = val"
                        placeholder="通貨単位"
                        emptyMessage="追加できます"
                        class="max-w-max custom-wrapper"
                    />
                    <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                </FormField>
                <!-- FormField v-slot="$field" name="app_image" initialValue="" class="flex flex-col gap-1">
                    <label for="app_image" class="flex items-center text-sm font-semibold">
                        <span>アプリケーション画像（任意）</span>
                        <i class="pi pi-question-circle text-surface-500 text-sm ml-1" title="あなたの好きな画像をこのアプリケーション用の画像として設定できます。この画像は指定URLから自動取得するアイコン画像よりも優先されます。"></i>
                    </label>
                    <InputText id="app_image" v-model="localApp.url" placeholder="アプリケーション画像" class="w-full" :pt="textFieldPT" />
                    <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                </FormField -->
                <FormField v-slot="$field" name="date_update_time" initialValue="" class="flex flex-col gap-1 mb-2">
                    <label for="date_update_time" class="flex items-center text-sm font-semibold">
                        <span>アプリケーション内の日付更新時間（任意）</span>
                        <i class="pi pi-question-circle text-surface-500 dark:text-gray-400 text-sm mx-2" title="このアプリケーションにおける日付が切り替わる時刻です。一般的にこの時間を跨ぐことでログイン日付が再計算されます。"></i>
                    </label>
                    <CalendarUI
                        v-model="dateUpdateTime"
                        :commit="false"
                        :timeOnly="true"
                        customIcon="🕒"
                    />
                    <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                </FormField>
            </div>
            <div class="flex flex-col gap-2 p-2 md:ml-2">
                <h3 class="text-primary-600 dark:text-primary-500 mb-1 font-semibold">ログ記録用の設定</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">PullLogでのログ記録時に利用できるアプリの詳細情報を設定できます。</p>
                <FormField v-slot="$field" name="rarity_defs" initialValue="" class="flex flex-col gap-1 mb-2">
                    <label for="rarity_defs" class="flex items-center text-sm font-semibold">
                        <span>レアリティ定義（任意）</span>
                        <i class="pi pi-question-circle text-surface-500 dark:text-gray-400 text-sm mx-2" title="アプリケーション内で使用されているレアリティの定義リストです。排出リストのレアリティオプションの初期リストとして使用されます。"></i>
                    </label>
                    <InputText id="rarity_defs" v-model="localApp.url" placeholder="レアリティ定義リスト" class="w-full" :pt="textFieldPT" />
                    <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                </FormField>
                <FormField v-slot="$field" name="marker_defs" initialValue="" class="flex flex-col gap-1 mb-2">
                    <label for="marker_defs" class="flex items-center text-sm font-semibold">
                        <span>マーカー定義（任意）</span>
                        <i class="pi pi-question-circle text-surface-500 dark:text-gray-400 text-sm mx-2" title="排出リストのマーキングオプションの初期マーカーリストとして使用されます。"></i>
                    </label>
                    <InputText id="marker_defs" v-model="localApp.url" placeholder="マーカー定義リスト" class="w-full" :pt="textFieldPT" />
                    <Message v-if="$field?.invalid" severity="error" size="small" variant="simple" class="text-red-500 text-sm mt-1">{{ $field.error?.message }}</Message>
                </FormField>
            </div>
        </Form>
        <template #closebutton>
            <Button icon="pi pi-times" class="h-8 w-8 p-1 rounded-full hover:bg-surface-200/50" @click.prevent="emit('update:visible', false)" v-blur-on-click />
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
                    @click.prevent="emit('submit', localApp)"
                    v-blur-on-click
                />
                <div class="w-auto"></div>
            </div>
        </template>
    </Dialog>
</template>
