import Sortable, { type SortableOptions } from "sortablejs"

const DEFAULT_OPTIONS: SortableOptions = {
    animation: 180,
    handle: "[data-drag-handle]",
    ghostClass: "stats-drag-ghost",
    chosenClass: "stats-drag-chosen",
    dragClass: "stats-drag-active",
}

export default defineNuxtPlugin(() => {
    return {
        provide: {
            sortable: {
                /**
                 * SortableJS のインスタンスを生成するヘルパー。
                 */
                create(element: HTMLElement, options: SortableOptions = {}) {
                    return Sortable.create(element, {
                        ...DEFAULT_OPTIONS,
                        ...options,
                    })
                },
            },
        },
    }
})
