import { endpoints } from "~/api/endpoints"
import { useAPI } from "~/composables/useAPI"

/**
 * 通貨データを管理するストア
 * - 旧 `utils/currency.ts` の機能を統合
 * - 通貨データはAPIでDBのcurrenciesテーブルから取得し、Mapにキャッシュ
 */
export const useCurrencyStore = defineStore("currency", () => {
    // composables
    const { callApi } = useAPI()

    // i18n
    const t = (key: string | number) => useNuxtApp().$i18n.t(key)

    // state
    const map = ref<Map<string, CurrencyData>>(new Map())
    const inflight = ref<Promise<void> | null>(null)
    const loadedAt = ref<number | null>(null)

    // Actions & Methods
    // 通貨データをAPIから取得し、Mapに格納
    async function ensureLoaded(force = false): Promise<void> {
        if (!force && map.value.size > 0) return
        if (inflight.value) return inflight.value // 既に読み込み中なら待機
        inflight.value = (async () => {
            const response = await callApi<CurrencyResponse>({
                endpoint: endpoints.currency.list(),
                method: "GET",
            })
            if (
                !response ||
                response.status === "error" ||
                !Array.isArray(response.data)
            ) {
                throw createError({
                    statusCode: 500,
                    statusMessage:
                        response?.message ?? t("app.error.loadCurrencyFailed"),
                })
            }
            map.value.clear() // 既存のデータをクリア
            for (const c of response.data)
                map.value.set(c.code.toUpperCase(), c)
            loadedAt.value = Date.now()
        })()
        try {
            await inflight.value
        } finally {
            inflight.value = null // 読み込み完了後はnullに戻す
        }
    }

    /**
     * 通貨コードをキーに通貨データを取得
     * - utils/currency.ts の getCurrency 関数と同等
     * - コードは大文字に変換してから検索
     * - 見つからない場合はundefinedを返す
     * @param codeLike - 通貨コードが含まれる文字列（例: 'USD', 'usd - US Dollar'）
     * @returns Currencyオブジェクトまたはundefined
     */
    function get(codeLike: string): CurrencyData | undefined {
        if (!codeLike) return undefined
        const code =
            codeLike
                .trim()
                .toUpperCase()
                .match(/[A-Z]{3}/)?.[0] ?? null
        return code ? map.value.get(code) : undefined
    }

    /**
     * デフォルトの通貨コードを取得
     * - localeに基づいてデフォルトの通貨コードを決定
     * @param locale - ロケール（例: 'en-US', 'ja-JP'）
     * @returns デフォルトの通貨コード
     */
    function defaultCurrencyCode(locale?: string): string {
        let ls: string | undefined = locale
        if (!ls) ls = useNuxtApp().$i18n.locale.value // デフォルトは現在のロケール
        // console.log('Default currency code for locale:', useNuxtApp().$i18n.locale.value)
        // デフォルトの通貨コードをロケールに基づいて決定
        switch (true) {
            case /ja/i.test(ls):
                return "JPY"
            case /en/i.test(ls):
                return "USD"
            case /zh/i.test(ls):
                return "CNY"
            case /ko/i.test(ls):
                return "KRW"
            default:
                return "USD" // その他はデフォルトでUSD
        }
    }

    /**
     * 小数点以下の値を通貨形式でフォーマット
     * - utils/currency.ts の formatCurrency 関数と同等
     * - localeはオプションで指定可能（デフォルトは'en-US'）
     * - 通貨コードが見つからない場合は、単純に数値をフォーマットして返す
     * @param valueDecimal - フォーマットする数値（浮動小数点が含まれる数値も可）
     * @param code - 通貨コード（例: 'USD', 'JPY', 'EUR'）
     * @param locale - ロケール（例: 'en-US', 'ja-JP', 'de-DE'）デフォルトは'en-US'
     * @returns フォーマットされた通貨文字列
     * @usage:
     * ```ts
     * formatDecimal(1234.56, 'USD') -> "$1,234.56"
     * formatDecimal(1234.56, 'JPY') -> "¥1,235"
     * formatDecimal(1234.56, 'EUR', 'de-DE') -> "1.234,56 €"
     * formatDecimal(1234.56, 'XYZ') -> "1,234.56 XYZ"
     * ```
     */
    function formatDecimal(
        valueDecimal: number,
        code: string,
        locale = "en-US",
    ): string {
        const cur = get(code)
        if (!cur) return `${valueDecimal.toLocaleString(locale)} ${code}`
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: cur.code,
        }).format(valueDecimal)
    }

    /**
     * 通貨単位ごとのstep値（グラフのY軸の目盛幅）を算出（Chart.js用）
     * - utils/currency.ts の getExpenseStepSize 関数と同等
     * @param code - 通貨コード
     * @return 通貨単位ごとのstep値
     */
    function getStepSize(code: string): number {
        const cur = get(code)
        if (!cur) return 1000
        if (cur.code === "KRW") return 5000
        if (cur.code === "JPY") return 1000
        if (cur.code === "CNY") return 50
        if (cur.code === "USD" || cur.code === "EUR") return 10
        // 基本は 10^(-minor_unit) * rounding (rounding=0のときは1扱い)
        let base = 10 ** -cur.minor_unit * (cur.rounding || 1)
        if (base < 1) base = 1
        if (base < 0.01) base = 0.01
        return base
    }

    /**
     * グラフのY軸最大値を「step単位」に合わせて繰り上げる（Chart.js用）
     * - utils/currency.ts の getExpenseYAxisMax 関数と同等
     * @param maxValue - グラフのY軸最大値
     * @param code - 通貨コード
     * @param alwaysUpper - trueならば、maxValueと同じ値のときも1つ上げる
     * @return 繰り上げたY軸最大値
     */
    function getYAxisMax(
        maxValue: number,
        code: string,
        alwaysUpper = true,
    ): number {
        const step = getStepSize(code)
        if (maxValue === 0) return step
        let yMax = Math.ceil(maxValue / step) * step
        if (alwaysUpper && yMax <= maxValue) yMax += step
        return yMax
    }

    function toLabel(c: CurrencyData): string {
        return `${c.code} — ${c.name_plural ?? c.name ?? c.code}`
    }

    /**
     * セレクト用オプションを生成（並び順: JPY/USD/CNY → EUR/INR/KRW → アルファベット）
     * - localeで初期選択コードを決めるときにも利用想定
     */
    function optionsForSelect(_locale?: string): CurrencyOption[] {
        const top1 = ["JPY", "USD", "CNY"]
        const top2 = ["EUR", "INR", "KRW"]

        // Map -> 配列
        const all = Array.from(map.value.values())

        // 存在する通貨コードだけに限定
        const pick = (codes: string[]) =>
            codes
                .map((c) => c.toUpperCase())
                .map((code) => map.value.get(code))
                .filter(Boolean) as CurrencyData[]

        const group1 = pick(top1)
        const group2 = pick(top2)
        const others = all
            .filter(
                (c) => ![...group1, ...group2].some((g) => g.code === c.code),
            )
            .sort((a, b) => a.code.localeCompare(b.code))

        return [...group1, ...group2, ...others].map((c) => ({
            value: c.code,
            label: toLabel(c),
        }))
    }

    return {
        ensureLoaded,
        get,
        defaultCurrencyCode,
        formatDecimal,
        getStepSize,
        getYAxisMax,
        optionsForSelect,
    }
})
