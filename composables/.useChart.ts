import type { ChartOptions } from 'chart.js'

/**
 * @usage
 * ```ts
 * import { useChart } from '~/composables/useChart'
 * const { chartData, chartOptions } = useChart(points, seriesSettings,
 *     customLabels, // If necessary
 *     {
 *         plugins: { legend: { position: 'bottom' } },
 *         scales: { x: { ... }, y: { ... } }
 *     }
 * )
 * ```
 */
export function useChart(
    rawData: Ref<ChartDataPoint[]> | ChartDataPoint[],
    seriesSettings: SeriesSetting[],
    labelsOverride?: string[],
    chartOptionsOverride?: Partial<ChartOptions>
) {
    // ラベル(X軸)
    const labels = computed(() => {
        if (labelsOverride) {
            return labelsOverride
        }
        return Array.isArray(rawData) ? rawData.map(d => d.date) : rawData.value.map(d => d.date)
    })
    // 各系列データ
    const datasets = computed(() =>
        seriesSettings.map(setting => {
            const dataArr = Array.isArray(rawData)
                ? rawData.map(d => setting.key === 'other_pulls'
                    ? (Number(d.total_pulls || 0) - Number(d.rare_pulls || 0))
                    : Number(d[setting.key] || 0))
                : rawData.value.map(d => setting.key === 'other_pulls'
                    ? (Number(d.total_pulls || 0) - Number(d.rare_pulls || 0))
                    : Number(d[setting.key] || 0))
            return {
                ...setting,
                data: dataArr
            }
        })
    )

    // チャートオプション
    const defaultChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            tooltip: {
                enabled: true,
                callbacks: {
                    label(
                        // biome-ignore lint:/suspicious/noExplicitAny
                        context: any
                    ) {
                        return `${context.dataset.label}: ${context.parsed.y}`
                    }
                }
            },
            legend: { position: 'top' as const }
        },
        scales: {
            x:  {
                title: { display: false, text: '日付' },
                stacked: true,
                ticks: { maxRotation: 90, minRotation: 30 }
            },
            y:  {
                title: { display: true, text: 'ガチャ回数' },
                stacked: true,
                position: 'left' as const
            },
            y1: {
                title: { display: true, text: '課金額' },
                position: 'right' as const,
                grid: { drawOnChartArea: false },
                beginAtZero: true
            }
        }
    }

    // biome-ignore lint:/suspicious/noExplicitAny
    function deepMerge(target: any, source: any): any {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                target[key] = deepMerge(target[key] || {}, source[key])
            } else {
                target[key] = source[key]
            }
        }
        return target
    }

    const chartOptions = computed<ChartOptions>(() => {
        if (chartOptionsOverride) {
            //return deepMerge(structuredClone(defaultChartOptions), chartOptionsOverride)
            return deepMerge(defaultChartOptions, chartOptionsOverride)
        }
        return defaultChartOptions
    })

    return {
        chartData: computed(() => ({
            labels: labels.value,
            datasets: datasets.value
        })),
        chartOptions
    }
}
