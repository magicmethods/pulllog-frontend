// https://nuxt.com/docs/api/configuration/nuxt-config
import fs from 'node:fs'
import path from 'node:path'
import Components from 'unplugin-vue-components/vite'
import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import { PullLogPreset } from './theme/preset'
import { ptPreset } from './theme/ptPreset'
import tailwindcssPostcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

// Set paths of SSL Cert. and secret-key
const httpsOptions = {
  key: fs.readFileSync(path.resolve(__dirname, 'public/localhost-key.pem'), 'utf8'),
  cert: fs.readFileSync(path.resolve(__dirname, 'public/localhost.pem'), 'utf8'),
}

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  typescript: {
    typeCheck: true,
    tsConfig: {
      include: ['types/**/*.d.ts'],
    },
  },
  ssr: false,
  runtimeConfig: {
    // サーバーサイド専用の環境変数
    apiBaseURL: process.env.API_BASE_URL,
    apiProxy: process.env.API_PROXY || '/api',
    secretApiKey: process.env.SECRET_API_KEY,
    // クライアントサイドでも使用する環境変数
    public: {
        appName: process.env.APP_NAME,
        appVersion: process.env.APP_VERSION,
        copyright: process.env.COPYRIGHT,
        apiBaseURL: process.env.API_BASE_URL,
        apiProxy: process.env.API_PROXY || '/api',
        isDebug: process.env.IS_DEBUG === 'true',
        mockMode: process.env.MOCK_MODE === 'true'
    }
  },
  app: {
    baseURL: '/',
    head: {
      script: [
        {
          src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8602791446931111',
          async: true,
          crossorigin: 'anonymous',
        },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=BIZ+UDGothic:wght@400;700&family=M+PLUS+Rounded+1c:wght@100;400&family=Nunito:ital,wght@0,200..700;1,200..700&display=swap',
        },
      ],
    },
  },
  css: [
    'primeicons/primeicons.css',
    '@loadingio/loading.css/loading.css',
    '@/assets/styles/tailwind_v4.scss',
    '@/assets/styles/index.scss',
  ],
  modules: [
    '@pinia/nuxt',
    '@primevue/nuxt-module',
  ],
  devServer: {
    host: 'pulllog.net',
    port: 4649,
    https: httpsOptions,
  },
  vite: {
    plugins: [
      Components({
        resolvers: [
          PrimeVueResolver()
        ],
        dts: true,
      }),
    ],
    css: {
      postcss: {
        plugins: [
          tailwindcssPostcss,
          autoprefixer(),
        ],
      },
      preprocessorOptions: {
        scss: {
          additionalData: '',
          sourceMapContents: true,
          quietDeps: false,
          silenceDeprecations: ['legacy-js-api'],
        },
      },
    },
    server: {
      https: httpsOptions,
    },
  },
  primevue: {
    usePrimeVue: true,
    autoImport: true,
    options: {
      theme: {
        preset: PullLogPreset,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: {
            name: 'primevue',
            order: 'tailwind-base, primevue, tailwind-components, tailwind-utilities',
          },
        },
      },
      pt: ptPreset,
      ptOptions: {
        mergeSections: true,
        mergeProps: true,
      }
    },
  }
})
