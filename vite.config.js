import { defineConfig } from 'vite'

export default defineConfig({
  base: '/namescrub/',
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
