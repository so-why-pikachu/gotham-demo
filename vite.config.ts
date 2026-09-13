import { createRequire } from 'module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)

const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')
const tailwindcss = require('@tailwindcss/vite')

export default defineConfig({
  server: { proxy: { '/api': `http://127.0.0.1:${process.env.API_PORT ?? 5182}` } },
  plugins: [react.default(), tailwindcss.default()],
  optimizeDeps: {
    entries: ['index.html', 'report-archive/index.html'],
    include: ['three/addons/controls/OrbitControls.js'],
  },
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        reports: fileURLToPath(new URL('./report-archive/index.html', import.meta.url)),
      },
    },
  },
})
