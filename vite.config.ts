import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset URLs, so the built site works from any folder (e.g. https://example.com/tv-demo/).
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        remote: fileURLToPath(new URL('remote.html', import.meta.url)),
      },
    },
  },
})
