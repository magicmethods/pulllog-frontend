<script setup lang="ts">
import { useAppStore } from '~/stores/useAppStore'

// Config
const appConfig = useConfig()

// Props & Emits
const props = defineProps<{
    visible: boolean
    logData: DateLog | null
    validationErrors: Record<string, string[]> | null
}>()
const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'close'): void
    (e: 'confirm'): void
}>()

// Stores
const appStore = useAppStore()

// Refs
const prevData = ref<DateLog | null>(null)
const isSuccessfullySaved = ref<boolean>(false)

</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="emit('update:visible', $event)"
        modal
        header="登録データの確認"
        :dismissableMask="true"
        :style="{ width: '60vw' }"
    >
        <div class="text-sm space-y-4">
            <div v-if="validationErrors && Object.keys(validationErrors).length > 0">
                <Message severity="error" variant="simple" size="small" class="py-1 px-2">入力内容に不備があります。修正してください</Message>
                <ul class="list-disc list-inside text-red-500">
                    <li v-for="(msgs, field) in validationErrors" :key="field">
                        <strong>{{ field }}:</strong> {{ msgs.join(', ') }}
                    </li>
                </ul>
            </div>
            <div v-else-if="logData">
                <Message severity="info" variant="simple" size="small" class="py-1 px-2">以下の内容で登録します</Message>
                <table class="w-full table-bordered">
                    <tbody>
                        <tr>
                            <th class="w-32">アプリ名</th>
                            <td class="w-auto flex justify-center items-center gap-2">
                                <span class="text-em">{{ appStore.app?.name }}</span>
                                <span v-if="appConfig.isDebug" class="text-sm">（{{ logData?.appId }}）</span>
                            </td>
                        </tr>
                        <tr>
                            <th>登録対象日</th>
                            <td class="text-em">{{ logData?.date }}</td>
                        </tr>
                        <tr>
                            <th>ガチャ回数</th>
                            <td><div class="diff-table">
                                <div>{{ prevData?.total_pulls ?? 0 }}</div>
                                <div><i class="pi pi-arrow-right"></i></div>
                                <div class="text-em">{{ logData?.total_pulls }}</div>
                            </div></td>
                        </tr>
                        <tr>
                            <th>最高レア排出数</th>
                            <td><div class="diff-table">
                                <div class="prev-cell">{{ prevData?.discharge_items ?? 0 }}</div>
                                <div class="transition-cell"><i class="pi pi-arrow-right"></i></div>
                                <div class="next-cell text-em">{{ logData?.discharge_items }}</div>
                            </div></td>
                        </tr>
                        <tr>
                            <th>排出内容</th>
                            <td><div class="diff-table">
                                <div class="text-em text-muted">{{ prevData?.drop_details ?? '&mdash;' }}</div>
                                <div><i class="pi pi-arrow-right"></i></div>
                                <div class="flex flex-wrap justify-start items-center gap-1">
                                    <template v-if="logData?.drop_details && logData.drop_details.length > 0">
                                        <div v-for="(item, index) in logData.drop_details" :key="`item-${index}`"
                                            class="rounded inline-flex flex-wrap justify-start bg-surface-200 dark:bg-gray-600/50 py-0.5 px-1.5 text-xs"
                                        >
                                            <span class="text-xs font-bold text-surface-900 dark:text-gray-100 whitespace-nowrap mr-2">{{ item.rarity }}</span>
                                            <span class="text-xs text-surface-500 dark:text-gray-400 mr-2"> {{ item.name }}</span>
                                            <span
                                                class="flex-grow text-xs text-surface-300 dark:text-gray-500 whitespace-nowrap"
                                                :class="{ 'rounded-lg px-1.5 bg-surface-600/50 dark:bg-gray-800/50': item.marker !== null }"
                                            >
                                                {{ item.marker }}
                                            </span>
                                        </div>
                                    </template>
                                    <template v-else>
                                        <div class="w-full text-em text-center">&mdash;</div>
                                    </template>
                                </div>
                            </div></td>
                        </tr>
                        <tr>
                            <th>課金額</th>
                            <td><div class="diff-table">
                                <div class="text-em text-muted">{{ prevData?.expense ?? 0 }}</div>
                                <div><i class="pi pi-arrow-right"></i></div>
                                <div class="text-em">{{ logData?.expense }}</div>
                            </div></td>
                        </tr>
                        <tr>
                            <th>タグ</th>
                            <td><div class="diff-table">
                                <div class="text-em text-muted">{{ prevData?.tags ?? '&mdash;' }}</div>
                                <div><i class="pi pi-arrow-right"></i></div>
                                <div class="flex flex-wrap justify-start items-center gap-1">
                                    <template v-if="logData?.tags && logData.tags.length > 0">
                                        <Chip v-for="(tag, index) in logData.tags" :key="`tag-${index}`"
                                            :label="tag"
                                            icon="pi pi-tag text-surface-300! dark:text-gray-600! mt-1.5 -mr-1"
                                            class="rounded-full bg-surface-200 dark:bg-gray-600/50 px-2 text-xs"
                                        />
                                    </template>
                                    <template v-else>
                                        <div class="w-full text-em text-center">&mdash;</div>
                                    </template>
                                </div>
                            </div></td>
                        </tr>
                        <tr>
                            <th>メモ</th>
                            <td><div class="diff-table">
                                <div class="text-em text-muted">{{ prevData?.free_text ?? '&mdash;' }}</div>
                                <div><i class="pi pi-arrow-right"></i></div>
                                <div class="text-em">
                                    <span v-if="logData?.free_text !== ''" class="text-sm!">{{ logData?.free_text }}</span>
                                    <span v-else class="text-center">&mdash;</span>
                                </div>
                            </div></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-else-if="isSuccessfullySaved">
                <Message severity="success" variant="simple" size="small" class="py-1 px-2">正常に保存されました。</Message>
            </div>
            <div v-else>
                <Message severity="warn" variant="simple" size="small" class="py-1 px-2">登録するデータがありません。</Message>
            </div>
        </div>
        <template #closebutton>
            <Button
                icon="pi pi-times"
                class="dismiss-button"
                @click.prevent="emit('close')"
                v-blur-on-click
            />
        </template>
        <template #footer>
            <div class="flex justify-end gap-3">
                <Button label="キャンセル" class="btn btn-alternative" @click="emit('close')" />
                <Button
                    v-if="logData && !isSuccessfullySaved"
                    label="保存する"
                    class="btn btn-primary"
                    :disabled="!!(validationErrors && Object.keys(validationErrors).length)"
                    @click="emit('confirm')"
                />
            </div>
        </template>
    </Dialog>
</template>
