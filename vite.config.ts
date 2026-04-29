import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/sign-tx/' : '/',
  plugins: [react(), wasm(), topLevelAwait()],
  optimizeDeps: { exclude: ['@emurgo/cardano-serialization-lib-browser'] },
  build: { target: 'es2022' },
})
