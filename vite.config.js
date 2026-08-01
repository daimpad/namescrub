import { defineConfig } from 'vite'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))
const buildDate = new Date().toISOString().slice(0, 16).replace('T', ' ')   // YYYY-MM-DD HH:MM (UTC)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_DATE__:  JSON.stringify(buildDate),
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: { main: 'index.html' }
    }
  },
  worker: {
    format: 'es'
  }
})
