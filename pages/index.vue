<script setup lang="ts">

definePageMeta({
    layout: 'landing'
})

</script>

<template>
  <div class="w-full md:w-4/5 flex flex-col justify-start items-stretch gap-12">
    <div class="flex flex-nowrap justify-center items-center bg-rose-400/25 dark:bg-rose-700/25 py-2">
      <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-6 h-6 inline-block mr-2 ld ld-swing" />
      <h2 class="text-primary dark:!text-white font-bold text-2xl text-center">PullLog - プルログ</h2>
    </div>
    <p class="text-center text-surface-600 dark:text-gray-500 font-medium text-base">
      This is a test of Tailwind CSS with <strong class="text-primary-emphasis!">PrimeVue</strong>.<br>
      <span class="text-sm">The button below is a PrimeVue button with <strong>Tailwind CSS</strong> classes applied.</span><br>
      <span class="text-xs">The <strong>smallest font size</strong> button below is a PrimeVue button with Tailwind CSS classes applied.</span><br>
      日本語の<strong class="text-primary-emphasis!">テキスト</strong>も含まれています。<br>
      <span class="text-sm">小さい<strong>フォントサイズ</strong>での日本語テキストの見た目を確認します。</span><br>
      <span class="text-xs">最小フォントサイズでの<strong>日本語テキスト</strong>はこのようになります。</span><br>
      <!-- /*
      1つ目のシリアルコード: BR16000019382C<br>
      2つ目のシリアルコード: BR170000189BCB<br>
      3つ目のシリアルコード: BR1800001C67C2<br>
      */ -->
    </p>
    <div class="flex-grow flex flex-col justify-center items-center gap-2">
      <NuxtLink to="/auth/verify?token=valid&type=signup" class="btn btn-alt">認証テスト（アカウント有効化：valid）</NuxtLink>
      <NuxtLink to="/auth/verify?token=f1ec638d9940185d1df61c5acc239780a19ce63d22b8fb9b868e18e3b54bde74&type=reset"  class="btn btn-alt">認証テスト（パスワード再設定：valid）</NuxtLink>
      <NuxtLink to="/auth/verify?token=invalid&type=signup" class="btn btn-alt">認証テスト（アカウント有効化：invalid）</NuxtLink>
      <NuxtLink to="/auth/verify?token=invalid&type=reset" class="btn btn-alt">認証テスト（パスワード再設定：invalid）</NuxtLink>
      <NuxtLink to="/apps" class="btn btn-alt">認証ページに直接アクセス</NuxtLink>
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