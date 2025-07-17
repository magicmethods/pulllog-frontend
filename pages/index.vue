<script setup lang="ts">
import { useI18n } from 'vue-i18n'
//import { useMarkdownContent } from '~/composables/useMarkdownContent'

definePageMeta({
    layout: 'landing'
})

const appConfig = useConfig()
const { t, locale } = useI18n()

// Refs & Local variables
const contents = ref<Record<string, string>>({
  //hero: '',
  //about: '',
  //gallery: '',
  //steps: '',
  //faq: '',
  //footer: ''
})
const isContentEmpty = ref<boolean>(true)

onBeforeMount(async () => {
  // セクション毎のMarkdownファイルを動的に読み込み
  await Promise.all(Object.keys(contents.value).map(async (section) => {
    contents.value[section] = await useMarkdownContent(`${locale.value}/${section}.md`)
  }))
  isContentEmpty.value = Object.values(contents.value).every(content => !content)
})

// Ad Setting
const adConfig: Record<string, AdProps> = {
    default: {
        adType: 'slot',
        adClient: appConfig.adsenseAccount,
        adSlotName: '8956575261',
    },
    bottom: {
        adType: 'slot',
        adClient: appConfig.adsenseAccount,
        adSlotName: '5664134061',
    }
}

</script>

<template>
  <div class="w-full md:w-4/5 flex flex-col justify-start items-stretch gap-12">
    <Head>
      <Title>PullLog - ガチャ履歴を記録・分析するWebアプリ</Title>
      <Meta name="description" content="引いた運命、残しておこう。ガチャ履歴を記録・可視化する専用Webアプリ PullLog。" />
    </Head>
    <div class="flex flex-nowrap justify-center items-center bg-rose-400/25 dark:bg-rose-700/25 py-2">
      <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-6 h-6 inline-block mr-2 ld ld-swing" />
      <h2 class="text-primary dark:!text-white font-bold text-2xl text-center">引いた運命、残しておこう。ガチャ履歴を記録・可視化する専用Webアプリ PullLog</h2>
    </div>
    <CommonPageHeader
      :title="t('app.name')"
      :adProps="adConfig.default"
    />
    <main v-if="!isContentEmpty" class="landing">
      <!-- 1. Heroセクション -->
      <section class="hero" v-html="contents.hero"></section>
      <!-- /* 2. Aboutセクション -- >
      <section class="about" v-html="contents.about"></section>
      < !-- 3. Gallery/スクリーンショット -- >
      <section class="gallery" v-html="contents.gallery"></section>
      < !-- 4. 使い方ステップ -- >
      <section class="steps" v-html="contents.steps"></section>
      < !-- 5. FAQ・ロードマップ -- >
      <section class="faq" v-html="contents.faq"></section>
      < !-- 6. Footer -- >
      <footer v-html="contents.footer"></footer>
      */ -->
    </main>
    <p class="text-center text-surface-600 dark:text-gray-500 font-medium text-base">
      <template v-if="locale === 'ja'">
        このページは、<strong class="text-primary-emphasis!">Tailwind CSS</strong>と<strong class="text-primary-emphasis!">PrimeVue</strong>のテスト用です。<br>
        <span class="text-sm">以下のボタンは、PrimeVueのボタンに<strong>Tailwind CSS</strong>のクラスが適用されています。</span><br>
        <span class="text-xs">以下の<strong>最小フォントサイズ</strong>のボタンは、PrimeVueのボタンにTailwind CSSのクラスが適用されています。</span><br>
        日本語の<strong class="text-primary-emphasis!">テキスト</strong>も含まれています。<br>
        <span class="text-sm">小さい<strong>フォントサイズ</strong>での日本語テキストの見た目を確認します。</span><br>
        <span class="text-xs">最小フォントサイズでの<strong>日本語テキスト</strong>はこのようになります。</span><br>
      </template>
      <template v-else>
        This is a test of Tailwind CSS with <strong class="text-primary-emphasis!">PrimeVue</strong>.<br>
        <span class="text-sm">The button below is a PrimeVue button with <strong>Tailwind CSS</strong> classes applied.</span><br>
        <span class="text-xs">The <strong>smallest font size</strong> button below is a PrimeVue button with Tailwind CSS classes applied.</span><br>
        日本語の<strong class="text-primary-emphasis!">テキスト</strong>も含まれています。<br>
        <span class="text-sm">小さい<strong>フォントサイズ</strong>での日本語テキストの見た目を確認します。</span><br>
        <span class="text-xs">最小フォントサイズでの<strong>日本語テキスト</strong>はこのようになります。</span><br>
      </template>
    </p>
    <div v-if="false" class="flex-grow flex flex-col justify-center items-center gap-2">
      <NuxtLink to="/auth/verify?token=TokenExample005&type=signup" class="btn btn-alt">認証テスト（アカウント有効化：valid）</NuxtLink>
      <NuxtLink to="/auth/verify?token=f1ec638d9940185d1df61c5acc239780a19ce63d22b8fb9b868e18e3b54bde74&type=reset"  class="btn btn-alt">認証テスト（パスワード再設定：valid）</NuxtLink>
      <NuxtLink to="/auth/verify?token=0d6b7d19a6e14d98a7aa2528cbc81a9b6f15a219e56e1cec122b0a7e77d3c192&type=reset" class="btn btn-alt">認証テスト（トークン有効期限切れ：invalid）</NuxtLink>
      <NuxtLink to="/auth/verify?token=invalid&type=reset" class="btn btn-alt">認証テスト（パスワード再設定：invalid）</NuxtLink>
      <NuxtLink to="/apps" class="btn btn-alt">認証ページに直接アクセス</NuxtLink>
      <NuxtLink to="/test" class="btn btn-alt">エラーページを確認</NuxtLink>
    </div>

    <div class="mt-auto pb-2 w-full min-h-max h-[90px]">
      <CommonEmbedAd v-bind="adConfig.bottom" />
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

<style lang="scss" scoped>
.landing {
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 80px;
    display: flex;
    flex-direction: column;
    gap: 80px;
    // グリッドやレスポンシブ等は後述
}
.hero {
    min-height: 480px;
    display: flex;
    align-items: center;
    background: linear-gradient(120deg, #9a48d0 0%, #ffd700 100%);
    border-radius: 2rem;
    position: relative;
    // カプセル等の演出は別途
}
.about, .gallery, .steps, .faq {
    background: #fff;
    border-radius: 1.5rem;
    box-shadow: 0 8px 32px rgba(80,50,120,0.07);
    padding: 3rem 2rem;
}
footer {
    text-align: center;
    color: #aaa;
    font-size: 0.9rem;
    padding: 2rem 0 1rem;
}
@media (max-width: 900px) {
    .landing {
        padding: 0 16px;
        gap: 32px;
    }
}
</style>