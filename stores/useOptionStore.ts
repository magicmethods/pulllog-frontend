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
        { symbol: '🏆', label: '🏆ピックアップ', value: 'pickup' },// Pickup
        { symbol: '💔', label: '💔すり抜け', value: 'lose' },// Lose 50/50
        { symbol: '🎯', label: '🎯狙い', value: 'target' },// Target
        //{ symbol: '⏫', label: '⏫+1凸', value: 'stack+1' },// Stack +1
        { symbol: '💖', label: '💖確定枠', value: 'guaranteed' },// Guaranteed
    ]

    // Options
    const currencyOptions = ref<SymbolOption[]>([...defaultCurrencyOptions])
    const rarityOptions = ref<SymbolOption[]>([...defaultRarityOptions])
    const symbolOptions = ref<SymbolOption[]>([...defaultSymbolOptions])
    const languageOptions = ref<BasicOption[]>([
        { label: '日本語', value: 'ja' },
        { label: 'English', value: 'en' }
    ])
    const themeOptions = ref<BasicOption[]>([
        { label: '🔆 ライト', value: 'light' },
        { label: '🌙 ダーク', value: 'dark' }
    ])
    const homepageOptions = ref<BasicOption[]>([
        { label: 'アプリ管理', value: '/apps' },
        { label: '履歴登録', value: '/history' },
        { label: '統計分析', value: '/stats' }
    ])
    const rangeSeparator = ref<string>('～') // 日付範囲のセパレーター
    const otherPlaceholder = ref<string>('<:other:>') // 「その他」プレースホルダー

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
    const languageLabels = computed(() =>
        languageOptions.value.map(opt => opt.label)
    )
    const themeLabels = computed(() => 
        themeOptions.value.map(opt => opt.label)
    )
    const homepageLabels = computed(() =>
        homepageOptions.value.map(opt => opt.label)
    )

    // Actions
    function resetOptions(): void {
        currencyOptions.value = [...defaultCurrencyOptions]
        rarityOptions.value = [...defaultRarityOptions]
        symbolOptions.value = [...defaultSymbolOptions]
    }

    function getOptionsAs(
        type: 'array' | 'object',
        target: 'currency' | 'rarity' | 'symbol' | 'language' | 'theme' | 'homepage'
    ): string[] | SymbolOption[] | BasicOption[] {
        if (type === 'array') {
            switch (target) {
                case 'currency': return currencyLabels.value
                case 'rarity':   return rarityLabels.value
                case 'symbol':   return markerLabels.value
                case 'language': return languageLabels.value
                case 'theme':    return themeLabels.value
                case 'homepage': return homepageLabels.value
            }
        }
        switch (target) {
            case 'currency': return currencyOptions.value
            case 'rarity':   return rarityOptions.value
            case 'symbol':   return symbolOptions.value
            case 'language': return languageOptions.value
            case 'theme':    return themeOptions.value
            case 'homepage': return homepageOptions.value
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
        languageOptions,
        themeOptions,
        homepageOptions,
        rangeSeparator,
        otherPlaceholder,
        currencyLabels,
        rarityLabels,
        markerLabels,
        resetOptions,
        setOptionsFromAppConfig,
        getOptionsAs,
    }
})
