// Types
export type Marker = 'lose' | 'pickup' | 'target' | 'guaranteed'

export type MarkerDictionary = {
    [locale: string]: {
        [K in Marker]: string[]
    }
}

// PullLog 用プリセット辞書（必要に応じて拡張）
export const markerSynonyms: MarkerDictionary = {
    ja: {
        lose: [
            'すり抜け', 'すりぬけ'
        ],
        pickup: [
            'ピックアップ', 'ピック'
        ],
        target: [
            '狙い'
        ],
        guaranteed: [
            '確定枠', '確定'
        ]
    },
    en: {
        lose: [
            'lose the 50/50', 'lose 50/50', 'lost the 50/50', 'lost 50/50',
            'lose 50-50', 'lost 50-50'
        ],
        pickup: [
            'pickup', 'picked up'
        ],
        target: [
            'target'
        ],
        guaranteed: [
            'guaranteed'
        ]
    },
    zh: {
        lose: [
            '歪了', '非捡起', '歪斜'
        ],
        pickup: [
            '捡起'
        ],
        target: [
            '目标'
        ],
        guaranteed: [
            '保底'
        ]
    }
}

// 全ロケールの同義語をマージして返す（重複除去）
export function aggregateSynonyms(
    ...dicts: MarkerDictionary[]
): Record<Marker, string[]> {
    const merged = {
        lose: new Set<string>(),
        pickup: new Set<string>(),
        target: new Set<string>(),
        guaranteed: new Set<string>(),
    }
    const all = [markerSynonyms, ...dicts]
    for (const dict of all) {
        for (const locale of Object.keys(dict)) {
            const m = dict[locale]
            if (!m) continue
            for (const k of (Object.keys(merged) as Marker[])) {
                for (const s of m[k] ?? []) {
                    merged[k].add(s)
                }
            }
        }
    }
    return {
        lose: [...merged.lose],
        pickup: [...merged.pickup],
        target: [...merged.target],
        guaranteed: [...merged.guaranteed],
    }
}
