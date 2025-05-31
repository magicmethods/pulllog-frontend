export const useOptionStore = defineStore('option', () => {
    // Local defaults
    const defaultCurrencyOptions: SymbolOption[] = [
        { label: 'JPY', value: 'JPY', desc: 'JPY - 円', symbol: '￥' },
        { label: 'USD', value: 'USD', desc: 'USD - ドル', icon: 'pi-dollar' },
        { label: 'EUR', value: 'EUR', desc: 'EUR - ユーロ', icon: 'pi-euro' },
        { label: 'CNY', value: 'CNY', desc: 'CNY - 人民元', symbol: '￥' },
    ]
    const defaultRarityOptions: SymbolOption[] = [
        { symbol: '', label: 'SSR', value: 'ssr' },
        { symbol: '', label: 'SR',  value: 'sr' },
        { symbol: '⭐', label: '⭐5', value: '5stars' },
        { symbol: '⭐', label: '⭐3', value: '3stars' },
    ]
    const defaultSymbolOptions: SymbolOption[] = [
        { symbol: '🏆', label: '🏆ピックアップ', value: 'pickup' },
        { symbol: '💔', label: '💔すり抜け', value: 'offrate' },
        { symbol: '🎯', label: '🎯狙い', value: 'target' },
        { symbol: '⏫', label: '⏫+1凸', value: 'stack+1' },
        { symbol: '💖', label: '💖完凸', value: 'complete' },
    ]

    // State
    const currencyOptions = ref<SymbolOption[]>([...defaultCurrencyOptions])
    const rarityOptions = ref<SymbolOption[]>([...defaultRarityOptions])
    const symbolOptions = ref<SymbolOption[]>([...defaultSymbolOptions])

    // Computed labels (UI表示用)
    const currencyLabels = computed(() =>
        currencyOptions.value.map(opt => opt.desc ? opt.desc : opt.label)
    )
    const rarityLabels = computed(() =>
        rarityOptions.value.map(opt => opt.label)
    )
    const markerLabels = computed(() =>
        symbolOptions.value.map(opt => opt.label)
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
