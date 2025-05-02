export const useOptionStore = defineStore('option', () => {
    // Local defaults
    const defaultCurrencyOptions: SymbolOption[] = [
        { label: 'JPY', value: 'jpy', desc: '円', symbol: '￥' },
        { label: 'USD', value: 'usd', desc: 'ドル', icon: 'pi-dollar' },
        { label: 'EUR', value: 'eur', desc: 'ユーロ', icon: 'pi-euro' },
        { label: 'CNY', value: 'cny', desc: '人民元', symbol: '￥' },
    ]
    const defaultRarityOptions: SymbolOption[] = [
        { label: 'SSR', value: 'ssr', order: -1 },
        { label: 'SR',  value: 'sr', order: -1 },
        { label: '⭐5', value: '5', order: -1 },
        { label: '⭐3', value: '3', order: -1 },
    ]
    const defaultSymbolOptions: SymbolOption[] = [
        { symbol: '🏆', label: 'ピックアップ', value: 'pickup', order: -1 },
        { symbol: '💔', label: 'すり抜け', value: 'offrate', order: -1 },
        { symbol: '🎯', label: '狙い', value: 'target', order: -1 },
        { symbol: '⏫', label: '+1凸', value: 'stack +1', order: -1 },
        { symbol: '💖', label: '完凸', value: 'complete', order: -1 },
    ]

    // State
    const currencyOptions = ref<SymbolOption[]>([...defaultCurrencyOptions])
    const rarityOptions = ref<SymbolOption[]>([...defaultRarityOptions])
    const symbolOptions = ref<SymbolOption[]>([...defaultSymbolOptions])

    // Computed labels (UI表示用)
    const currencyLabels = computed(() =>
        currencyOptions.value.map(opt =>
            opt.desc ? `${opt.label} - ${opt.desc}` : opt.label
        )
    )
    const rarityLabels = computed(() =>
        rarityOptions.value.map(opt => `${opt.symbol ?? ''}${opt.label}`)
    )
    const markerLabels = computed(() =>
        symbolOptions.value.map(opt => `${opt.symbol ?? ''}${opt.label}`)
    )

    // Actions
    function resetOptions(): void {
        currencyOptions.value = [...defaultCurrencyOptions]
        rarityOptions.value = [...defaultRarityOptions]
        symbolOptions.value = [...defaultSymbolOptions]
    }

    function getOptionsAs(
        type: 'array' | 'object',
        target: 'currency' | 'rarity' | 'symbol'
    ): string[] | SymbolOption[] {
        if (type === 'array') {
            switch (target) {
                case 'currency': return currencyLabels.value
                case 'rarity':   return rarityLabels.value
                case 'symbol':   return markerLabels.value
            }
        }
        switch (target) {
            case 'currency': return currencyOptions.value
            case 'rarity':   return rarityOptions.value
            case 'symbol':   return symbolOptions.value
        }
    }

    function setOptionsFromAppConfig(appConfig: {
        currencyOptions?: SymbolOption[]
        rarityOptions?: SymbolOption[]
        symbolOptions?: SymbolOption[]
    }): void {
        currencyOptions.value = appConfig.currencyOptions?.length
            ? [...appConfig.currencyOptions]
            : [...defaultCurrencyOptions]

        rarityOptions.value = appConfig.rarityOptions?.length
            ? [...appConfig.rarityOptions]
            : [...defaultRarityOptions]

        symbolOptions.value = appConfig.symbolOptions?.length
            ? [...appConfig.symbolOptions]
            : [...defaultSymbolOptions]
    }

    return {
        currencyOptions,
        rarityOptions,
        symbolOptions,
        currencyLabels,
        rarityLabels,
        markerLabels,
        resetOptions,
        setOptionsFromAppConfig,
        getOptionsAs,
    }
})
