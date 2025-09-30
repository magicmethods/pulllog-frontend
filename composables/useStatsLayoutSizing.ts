const SIZE_ORDER: StatsTileSize[] = [
    "span-2",
    "span-3",
    "span-4",
    "span-5",
    "span-6",
]

interface ViewportFlags {
    isMd: boolean
    isLg: boolean
}

function clampTabletSize(size: StatsTileSize): StatsTileSize {
    if (size === "span-3" || size === "span-6") return size
    return size === "span-2" ? "span-3" : "span-6"
}

export function useStatsLayoutSizing() {
    function getSizeOptions(flags: ViewportFlags): StatsTileSize[] {
        if (!flags.isMd) return []
        if (!flags.isLg) return ["span-3", "span-6"]
        return SIZE_ORDER
    }

    function clampSizeForViewport(
        size: StatsTileSize,
        flags: ViewportFlags,
    ): StatsTileSize {
        if (!flags.isMd) return "span-6"
        if (!flags.isLg) return clampTabletSize(size)
        return size
    }

    function toSpanValue(size: StatsTileSize): number {
        const [, value] = size.split("-")
        const span = Number.parseInt(value ?? "6", 10)
        if (Number.isNaN(span)) return 6
        return Math.min(Math.max(span, 2), 6)
    }

    return {
        sizeOrder: SIZE_ORDER as readonly StatsTileSize[],
        getSizeOptions,
        clampSizeForViewport,
        toSpanValue,
    }
}
