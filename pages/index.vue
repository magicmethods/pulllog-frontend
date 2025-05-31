<script setup lang="ts">

definePageMeta({
    layout: 'landing'
})

const toast = useToast()
const isDarkMode = ref(false)
const initialValues = reactive({
    username: ''
})

// @ts-ignore
const resolver = ({ values }) => {
    const errors = {} as Record<string, unknown>

    if (!values.username) {
        errors.username = [{ message: 'Username is required.' }]
    }

    return {
        values, // (Optional) Used to pass current form values to submit event.
        errors
    }
}

// @ts-ignore
const onFormSubmit = ({ valid }) => {
    if (valid) {
        toast.add({
            severity: 'success',
            summary: 'Form is submitted.',
            life: 3000
        })
    }
}

const toHome = () => {
    // Redirect to the home page
    navigateTo('/')
}

const onClickHandler = (event: MouseEvent) => {
    toggleRenderingMode()
}

// Toggle a class on the <html> tag to switch rendering modes
const toggleRenderingMode = () => {
    const htmlElement = document.documentElement
    htmlElement.classList.toggle('app-dark')
    isDarkMode.value = htmlElement.classList.contains('app-dark')
}

onMounted(() => {
    // Check if the user has a preference for dark mode and set the class accordingly
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDarkMode) {
        document.documentElement.classList.add('app-dark')
        isDarkMode.value = true
    } else {
        document.documentElement.classList.remove('app-dark')
        isDarkMode.value = false
    }
})

</script>

<template>
  <div class="flex flex-col gap-12">
    <div class="flex flex-nowrap justify-center items-center bg-rose-200 dark:bg-rose-400 py-2">
      <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-6 h-6 inline-block mr-2 ld ld-swing" />
      <h2 class="text-primary dark:!text-white font-bold text-2xl text-center" @click="toHome">PullLog - プルログ</h2>
      <!-- img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-6 h-6 inline-block ml-2 ld ld-spin" /-->
    </div>
    <p class="text-center text-gray-600 dark:text-gray-300 font-medium text-base">
      This is a test of Tailwind CSS with <strong class="text-primary-emphasis!">PrimeVue</strong>.<br>
      <span class="text-sm">The button below is a PrimeVue button with <strong>Tailwind CSS</strong> classes applied.</span><br>
      <span class="text-xs">The <strong>smallest font size</strong> button below is a PrimeVue button with Tailwind CSS classes applied.</span><br>
      日本語の<strong class="text-primary-emphasis!">テキスト</strong>も含まれています。<br>
      <span class="text-sm">小さい<strong>フォントサイズ</strong>での日本語テキストの見た目を確認します。</span><br>
      <span class="text-xs">最小フォントサイズでの<strong>日本語テキスト</strong>はこのようになります。</span><br>
      1つ目のシリアルコード: BR16000019382C<br>
      2つ目のシリアルコード: BR170000189BCB<br>
      3つ目のシリアルコード: BR1800001C67C2<br>
    </p>
    <Button
      label="PrimeVue Button"
      :icon="`pi pi-${isDarkMode ? 'sun' : 'moon'}`"
      iconPos="right"
      @click="toggleRenderingMode"
      class="btn btn-secondary"
      v-blur-on-click
    />
    <div class="card flex justify-center">
      <Toast />

      <Form v-slot="$form" :initialValues :resolver @submit="onFormSubmit" class="flex flex-col gap-4 w-full sm:w-56">
        <div class="flex flex-col gap-1">
          <InputText name="username" type="text" placeholder="Username" fluid class="rounded-border py-1.5 px-2 border border-surface focus:ring-2 focus:ring-primary-100 focus:outline-none dark:focus:ring-primary-800" />
          <Message v-if="$form.username?.invalid" severity="error" size="small" variant="simple">{{ $form.username.error?.message }}</Message>
        </div>
        <Button type="submit" severity="secondary" label="Submit" class="btn btn-primary" v-blur-on-click />
      </Form>
    </div>
    <div class="flex gap-6 flex-wrap">
      <div class="rounded-border p-4 border border-transparent flex items-center justify-center bg-primary hover:bg-primary-emphasis text-white font-medium flex-auto transition-colors">
        Primary
      </div>
      <div class="rounded-border p-4 border border-transparent flex items-center justify-center bg-highlight hover:bg-highlight-emphasis font-medium flex-auto transition-colors">
        Highlight
      </div>
      <div class="rounded-border p-4 border border-surface flex items-center justify-center text-muted-color hover:text-color hover:bg-emphasis font-medium flex-auto transition-colors">
        Box
      </div>
    </div>
  </div>
</template>