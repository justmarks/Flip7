import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Flip7/',
  server: {
    proxy: {
      '/bgg': {
        target: 'https://boardgamegeek.com/',
        changeOrigin: true,
        secure: true,
        followRedirects: true,
        rewrite: (path) => path.replace('/bgg/', '')
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  }
})
