export const useOptionStore = defineStore('option', () => {
    // i18n
    const t = (key: string | number) => useNuxtApp().$i18n.t(key)

    // Options
    const exampleApps = computed<string[]>(() => ([
        t('options.exampleApp1'),
        t('options.exampleApp2'),
        t('options.exampleApp3'),
        t('options.exampleApp4'),
        t('options.exampleApp5'),
    ]))
    const currencyOptions = computed<SymbolOption[]>(() => ([
        { label: t('options.currency.jpy'), value: 'JPY', desc: t('options.currency.jpyDesc'), symbol: '￥' },
        { label: t('options.currency.usd'), value: 'USD', desc: t('options.currency.usdDesc'), icon: 'pi-dollar' },
        { label: t('options.currency.eur'), value: 'EUR', desc: t('options.currency.eurDesc'), icon: 'pi-euro' },
        { label: t('options.currency.cny'), value: 'CNY', desc: t('options.currency.cnyDesc'), symbol: '￥' },
    ]))
    const rarityOptions = computed<SymbolOption[]>(() => ([
        { symbol: '', label: t('options.rarity.ssr'), value: 'ssr' },
        { symbol: '', label: t('options.rarity.sr'),  value: 'sr' },
        { symbol: '⭐', label: t('options.rarity.fiveStars'), value: '5stars' },
        { symbol: '⭐', label: t('options.rarity.threeStars'), value: '3stars' },
    ]))
    const symbolOptions = computed<SymbolOption[]>(() => ([
        { symbol: '🏆', label: t('options.symbol.pickup'), value: 'pickup' },
        { symbol: '💔', label: t('options.symbol.lose'), value: 'lose' },
        { symbol: '🎯', label: t('options.symbol.target'), value: 'target' },
        { symbol: '💖', label: t('options.symbol.guaranteed'), value: 'guaranteed' },
    ]))
    const languageOptions = computed<BasicOption[]>(() => ([
        { label: t('options.language.ja'), value: 'ja' },
        { label: t('options.language.en'), value: 'en' },
        { label: t('options.language.zh'), value: 'zh' },
    ]))
    const themeOptions = computed<BasicOption[]>(() => ([
        { label: t('options.theme.light'), value: 'light' },
        { label: t('options.theme.dark'), value: 'dark' },
    ]))
    const homepageOptions = computed<BasicOption[]>(() => ([
        { label: t('options.homepage.apps'), value: '/apps' },
        { label: t('options.homepage.history'), value: '/history' },
        { label: t('options.homepage.stats'), value: '/stats' }
    ]))
    const rangeSeparator = computed<string>(() => t('options.rangeSeparator')) // 日付範囲のセパレーター
    const otherPlaceholder = ref<string>('<:other:>') // 「その他」プレースホルダー

    // Computed labels (UI表示用)
    const currencyLabels = computed(() =>
        currencyOptions.value.map(opt => opt.desc && opt.desc !== '' ? opt.desc : opt.label)
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

    return {
        exampleApps,
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
        getOptionsAs,
        //setOptionsFromAppConfig,
    }
})
