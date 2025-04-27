import type { Config } from 'tailwindcss'
import tailwindcssPrimeui from 'tailwindcss-primeui'

const config: Config = {
  darkMode: ['selector', '[class*="app-dark"]'],
  content: [
    './components/**/*.vue',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './assets/**/*.{scss,css}',
    './nuxt.config.ts',
  ],
  plugins: [tailwindcssPrimeui],
  theme: {
    extend: {
        screens: {
          sm: '576px',
          md: '768px',
          lg: '992px',
          xl: '1200px',
          '2xl': '1920px',
        },
        /** extended container styles for non-breakpoint */
        container: {
            padding: '0',
            screens: {
              sm: '100%',
              md: '100%',
              lg: '100%',
              xl: '100%',
              '2xl': '100%',
            },
        },
        fontFamily: {
          sans: ['Nunito', 'M PLUS Rounded 1c', 'BIZ UDGothic', 'sans-serif'],
        },
    },
  },
}
export default config
