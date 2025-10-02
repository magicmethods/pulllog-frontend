import { defineAsyncComponent } from "vue"
import { defineNuxtPlugin } from "#app"

const components = {
    Dialog: () => import("primevue/dialog"),
    Drawer: () => import("primevue/drawer"),
    DataTable: () => import("primevue/datatable"),
    Column: () => import("primevue/column"),
    ColumnGroup: () => import("primevue/columngroup"),
    FileUpload: () => import("primevue/fileupload"),
} as const

export default defineNuxtPlugin((nuxtApp) => {
    for (const [name, loader] of Object.entries(components)) {
        nuxtApp.vueApp.component(
            name,
            defineAsyncComponent({
                loader: async () => (await loader()).default,
                suspensible: false,
            }),
        )
    }
})
