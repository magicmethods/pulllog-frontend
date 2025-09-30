import type { Sortable, SortableOptions } from "sortablejs"

declare module "#app" {
    interface NuxtApp {
        $sortable: {
            create(element: HTMLElement, options?: SortableOptions): Sortable
        }
    }
}

declare module "vue" {
    interface ComponentCustomProperties {
        $sortable: {
            create(element: HTMLElement, options?: SortableOptions): Sortable
        }
    }
}
