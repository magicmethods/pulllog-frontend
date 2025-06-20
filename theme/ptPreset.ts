export const ptPreset = {
    // --- Breadcrumb系 --- (index.vue)
    Breadcrumb: {
        root: 'bg-transparent p-0 -mt-1 mb-1',
        list: 'bg-transparent h-6 flex justify-start items-baseline',
        item: 'bg-transparent text-surface-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 text-base',
        itemIcon: 'text-surface-500 dark:text-gray-400',
        separator: 'relative bg-transparent top-[1px] text-surface-300 dark:text-gray-600'
    },

    // --- InputText系 --- (login.vue, register.vue, AppEditModal.vue, PullItemDetail.vue etc.)
    InputText: {
        root: 'input-base input-hoverable',
    },

    // --- InputNumber系 --- (index.vue)
    InputNumber: {
        pcinputtext: {
            root: 'input-base input-hoverable',
        },
        incrementButton: 'hover:text-primary disabled:text-surface-600/50',
        decrementButton: 'hover:text-primary disabled:text-surface-600/50',
    },

    // --- Password系 --- (login.vue, register.vue, settings.vue)
    Password: {
        pcInputText: {
            root: 'input-base input-hoverable',
        },
        maskIcon: '-mt-2',
        unmaskIcon: '-mt-2',
        overlay: 'p-4 dark:bg-gray-950',
        meter: 'bg-surface-200 dark:bg-gray-800',
        meterText: 'text-surface-600 dark:text-gray-100',
    },

    // --- Textarea系 --- (index.vue, AppEditModal.vue)
    Textarea: {
        root: {
            class: 'input-base input-hoverable placeholder:text-surface-400 dark:placeholder:text-gray-400 dark:disabled:placeholder:text-gray-600/50',
        }
    },

    // --- Checkbox系 --- (register.vue)
    Checkbox: {
        root: '-mt-1.5',
        box: 'border rounded border-surface-300 dark:border-surface-600',
        icon: 'dark:text-white',
    },

    // --- ToggleButton系 --- (Header.vue)
    ToggleButton: {
        root: 'h-8 p-0 m-0 -my-1 border-none bg-transparent focus:outline-none',
        content: 'flex items-center justify-center m-0 p-1 rounded-md bg-primary-500 dark:bg-primary-700 hover:bg-primary-400/40 dark:hover:bg-primary-500/40',
        icon: 'mx-0 p-0 text-sm text-primary-50 hover:text-primary-200 pointer-events-auto',
        label: 'mx-0 p-0 text-sm pointer-events-auto',
    },

    // --- Dialog系 --- (AppEditModal.vue)
    Dialog: {
        root: {
            class: 'dialog-base',
        },
        header: 'dialog-header',
        title: '',
        pcmaximizebutton: {
            root: 'dismiss-button',
        },
        pcclosebutton: {
            class: 'dismiss-button',
        },
        content: 'dialog-content',
        footer: 'dialog-footer',
        mask: {
            class: 'backdrop-blur-sm'
        },
    },

    // --- DatePicker系 --- (CalendarUI.vue)
    DatePicker: {
        root: {
            class: 'min-w-min',
        },
        pcinputtext: {
            root: 'w-full border rounded px-3 py-2 border-surface dark:border-gray-700 focus:ring-2 dark:bg-gray-950 focus:ring-primary-200/50 focus:dark:ring-primary-800/40 outline-none disabled:bg-surface-200/50 disabled:text-surface-600/50',
        },
        inputIconContainer: 'absolute right-2 top-1/2 -translate-y-1/2',
        panel: 'min-w-max border rounded-md border-surface-200 dark:border-gray-700 shadow-lg',
        calendarContainer: 'w-full rounded-md dark:bg-gray-900',
        calender: 'w-full p-0',
        header: 'flex items-center justify-between p-1 rounded-t-md border-b border-surface-200 dark:border-gray-700 dark:bg-gray-950',
        pcprevbutton: {
            root: 'p-1 rounded-full hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
        },
        selectMonth: 'mr-0.5 px-3 py-2 rounded hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
        selectYear: 'ml-0.5 px-3 py-2 rounded hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
        decade: 'px-3 py-2 rounded hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
        pcNextButton: {
            root: 'p-1 rounded-full hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40'
        },
        dayView: {
          class: 'table-auto border-collapse',
        },
        tableHeaderRow: 'text-sm font-semibold text-surface-500 border-b border-surface bg-surface-200/50 dark:bg-gray-700/40',
        tableHeaderCell: 'w-1/7 py-1 border-r border-surface text-center last:border-0 first:bg-rose-200/50 first:dark:bg-rose-600/40 last:bg-blue-200/50 last:dark:bg-blue-600/40',
        tableBodyRow: 'text-sm font-semibold text-surface-500 border-b border-surface last:border-0',
        dayCell: 'w-1/7 p-0 border-r border-surface text-center last:border-0 hover:bg-primary-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
        day: {
          class: 'mx-auto rounded-none text-sm font-semibold hover:bg-primary-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
          style: 'width: calc(100% + 2px);',
        },
        monthView: {
          class: 'flex flex-wrap justify-evenly gap-0.5 m-0.5 dark:bg-gray-900',
        },
        month: 'flex items-center justify-center w-1/4 h-8 rounded text-sm font-semibold hover:bg-primary-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
        yearView: {
          class: 'flex flex-wrap justify-evenly gap-0.5 m-0.5 dark:bg-gray-900',
        },
        year: 'flex items-center justify-center w-1/3 h-8 rounded text-sm font-semibold hover:bg-primary-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
        pcIncrementButton: {
            root: 'p-1 rounded-full hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
        },
        pcDecrementButton: {
            root: 'p-1 rounded-full hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
        },
        buttonbar: 'flex items-center justify-between p-1 rounded-b-md border-t border-surface-200 dark:border-gray-700 dark:bg-gray-950',
        pcTodayButton: {
            root: 'px-3 py-1.5 rounded-md hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
        },
        pcClearButton: {
            root: 'px-3 py-1.5 rounded-md hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
        },
        timepicker: 'rounded-md dark:bg-gray-950',
    },

    // --- Dropdown/SelectBox系 --- (ComboBox.vue, SelectApps.vue)
    Select: {
        root: {
            class: 'input-base input-hoverable',
        },
        label: 'bg-white dark:bg-gray-950',
        overlay: 'mt-0 border border-surface-300 rounded shadow-lg dark:border-gray-700',
        listContainer: 'rounded border-none overflow-y-auto',
        list: 'rounded bg-white dark:bg-gray-950',
        option: 'w-full p-2 flex justify-between items-center hover:text-primary-500 hover:bg-primary-200/50 dark:hover:bg-primary-700/40 dark:hover:text-primary-200',
        clearIcon: 'border rounded-full border-surface-400 bg-surface-100 text-surface-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-surface-200 dark:hover:bg-gray-600 w-4 h-4 p-0.5 right-8 -translate-y-1/2',
        dropdown: 'max-w-max bg-white border-surface dark:bg-gray-950 dark:border-gray-700',
        dropdownIcon: 'text-surface-400 hover:text-primary-500',
        emptymessage: 'py-2 px-3 text-surface-400 dark:text-gray-400/50 select-none',
    },

    // --- Chips系 --- (InputTags.vue)
    Chips: {
        root: 'border border-surface dark:border-gray-700 dark:bg-gray-950 rounded hover:ring-2 hover:ring-primary-200/50 hover:dark:ring-primary-800/40 outline-none py-2 pl-3 m-0 items-center',
        input: 'bg-transparent shadow-none',
        inputitemfield: {
            class: 'w-full border-none outline-none bg-transparent dark:bg-gray-950 focus:ring-0',
        },
        clearIcon: 'right-9 -translate-y-1/2',
    },

    // --- Tooltip系 --- (AppEditModal.vue) ※ ptPreset.ts経由だと動作しないのでコンポーネント側で指定が必要
    Tooltip: {
        root: 'pb-1',
        text: 'w-max max-w-[20rem] p-3 bg-surface-600 text-white dark:bg-gray-700 font-medium text-xs',
        arrow: 'w-2 h-2 rotate-[45deg] border-b border-4 border-surface-600 dark:border-gray-700',
    },

    // --- ToggleSwitch系 --- (AppEditModal.vue) ※ 色指定は DesignToken(dt) で行う必要がある
    ToggleSwitch: {
        slider: 'border border-surface-400/50 dark:border-gray-700/40',
        handle: '-translate-y-1/2',
    },

    // --- Fieldset系 --- (AppEditModal.vue)
    Fieldset: {
        root: 'border border-dotted rounded-lg border-surface-500/50 dark:border-gray-700 p-4 bg-transparent',
        legend: 'text-md font-semibold text-primary-600 dark:text-primary-400 bg-transparent px-2',
    },

    // --- FormField系 --- (AppEditModal.vue)
    FormField: {
        root: 'w-full flex flex-col gap-1 mb-2',
    },

    // --- InputGroupAddon系 --- (InputOptions.vue)
    InputGroupAddon: {
        root: 'bg-surface-200 dark:bg-gray-700 border border-surface-300 dark:border-gray-600',
        icon: 'text-surface-500 dark:text-gray-400',
        label: 'text-sm text-surface-500 dark:text-gray-400',
    },

    // --- Toast --- (index.vue)
    Toast: {
        message: 'border rounded-lg w-full mb-2 p-2 shadow-lg',
        messageicon: 'mt-0.5',
        buttoncontainer: '-mt-1',
    },

    // --- ScrollPanel --- (HistoryList.vue)
    ScrollPanel: {
        barX: 'bg-primary-200 focus:bg-primary-400 hover:bg-primary-400 dark:bg-primary-500 dark:focus:bg-primary-600 dark:hover:bg-primary-600',
        barY: 'bg-primary-200 focus:bg-primary-400 hover:bg-primary-400 dark:bg-primary-500 dark:focus:bg-primary-600 dark:hover:bg-primary-600',
    },

    // --- Avatar --- (Header.vue, settings.vue)
    Avatar: {
        root: 'bg-surface-200 text-primary-600 dark:bg-gray-700 dark:text-primary-400 font-bold',
    },

    // --- Drawer --- (default.vue)
    Drawer: {
        root: 'relative w-96! bg-white text-surface-600 dark:bg-gray-900 dark:text-gray-200',
        header: 'p-4',
        title: 'invisible opacity-0',
        pcCloseButton: { root: 'mt-2 border-0 outline-0 rounded-full hover:bg-surface-200/40 dark:hover:bg-gray-700/40 hover:text-primary-600 dark:hover:text-primary-400 z-10!' },
        content: 'absolute top-0',
    },

    // --- FileUpload --- (settings.vue)
    FileUpload: {
        root: 'flex flex-nowrap justify-between items-center border border-surface-300 dark:border-gray-800 dark:bg-gray-950 rounded-lg',
        header: 'flex-grow flex flex-col justify-center items-start gap-2 p-2',
        pcChooseButton: { root: 'btn btn-xs btn-uploader' },
        pcUploadButton: { root: 'btn btn-xs btn-uploader' },
        pcCancelButton: { root: 'btn btn-xs btn-uploader' },
        content: 'flex-grow min-h-[7rem] p-4 border-l border-surface-300 dark:border-gray-800 flex flex-col justify-center items-start',
        pcProgressBar: {
            root: 'w-full h-1 bg-surface-200 dark:bg-gray-800 rounded-full overflow-hidden',
            value: 'bg-primary-500 dark:bg-primary-600',
        },
        pcMessage: { root: 'p-2' },
        fileThumbnail: 'h-16 w-16 rounded-full',
        fileInfo: 'text-sm',
        pcFileBadge: { root: 'px-2 rounded-full text-xs bg-amber-400 text-surface-600 dark:bg-yellow-600 dark:text-white' },
        pcFileRemoveButton: { root: 'rounded-full text-surface-400 dark:text-gray-600 hover:text-primary-500 dark:hover:text-primary-400 bg-transparent hover:bg-surface-100 dark:hover:bg-gray-800/40' },
        empty: 'text-sm text-muted',
    },
}
