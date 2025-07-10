export const useOptionStore = defineStore('option', () => {
    // i18n
    //const { t, locale } = useI18n()
    const t = (key: string | number) => useNuxtApp().$i18n.t(key)
    // getter

    //console.log('useOptionStore:', locale.value)

    // Options
    const currencyOptions = computed<SymbolOption[]>(() => [
        { label: t('options.currency.jpy'), value: 'JPY', desc: t('options.currency.jpyDesc'), symbol: '￥' },
        { label: t('options.currency.usd'), value: 'USD', desc: t('options.currency.usdDesc'), icon: 'pi-dollar' },
        { label: t('options.currency.eur'), value: 'EUR', desc: t('options.currency.eurDesc'), icon: 'pi-euro' },
        { label: t('options.currency.cny'), value: 'CNY', desc: t('options.currency.cnyDesc'), symbol: '￥' },
    ])
    const rarityOptions = computed<SymbolOption[]>(() => [
        { symbol: '', label: t('options.rarity.ssr'), value: 'ssr' },
        { symbol: '', label: t('options.rarity.sr'),  value: 'sr' },
        { symbol: '⭐', label: t('options.rarity.fiveStars'), value: '5stars' },
        { symbol: '⭐', label: t('options.rarity.threeStars'), value: '3stars' },
    ])
    const symbolOptions = computed<SymbolOption[]>(() => [
        { symbol: '🏆', label: t('options.symbol.pickup'), value: 'pickup' },
        { symbol: '💔', label: t('options.symbol.lose'), value: 'lose' },
        { symbol: '🎯', label: t('options.symbol.target'), value: 'target' },
        { symbol: '💖', label: t('options.symbol.guaranteed'), value: 'guaranteed' },
    ])
    /*
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
    */
    const languageOptions = ref<BasicOption[]>([
        { label: t('options.language.ja'), value: 'ja' },
        { label: t('options.language.en'), value: 'en' }
    ])
    function getLanguageOptions(t: (key: string) => string): BasicOption[] {
        return [
            { label: t('options.language.ja'), value: 'ja' },
            { label: t('options.language.en'), value: 'en' }
        ]
    }
    const themeOptions = computed<BasicOption[]>(() => ([
        { label: t('options.theme.light'), value: 'light' },
        { label: t('options.theme.dark'), value: 'dark' }
    ]))
    const homepageOptions = computed<BasicOption[]>(() => ([
        { label: t('options.homepage.apps'), value: '/apps' },
        { label: t('options.homepage.history'), value: '/history' },
        { label: t('options.homepage.stats'), value: '/stats' }
    ]))
    /*
    const themeOptions = ref<BasicOption[]>([
        { label: '🔆 ライト', value: 'light' },
        { label: '🌙 ダーク', value: 'dark' }
    ])
    const homepageOptions = ref<BasicOption[]>([
        { label: 'アプリ管理', value: '/apps' },
        { label: '履歴登録', value: '/history' },
        { label: '統計分析', value: '/stats' }
    ])
    */
    const rangeSeparator = ref<string>(t('options.rangeSeparator')) // 日付範囲のセパレーター
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
    /*
    function resetOptions(): void {
        currencyOptions.value = [...defaultCurrencyOptions]
        rarityOptions.value = [...defaultRarityOptions]
        symbolOptions.value = [...defaultSymbolOptions]
    }
    */
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
    /*
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
    */

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
        //resetOptions,
        //setOptionsFromAppConfig,
        getOptionsAs,
        getLanguageOptions,
    }
})
