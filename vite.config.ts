import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// GitHub Pages serves the app from /<repo>/
export default defineConfig({
  base: '/election-statistics/',
  plugins: [react()],
  // maplibre-gl cannot be pre-bundled by esbuild; its worker module fails to build.
  // It finds its worker by rewriting import.meta.url, which the bundler replaces,
  // so the URL is pointed at the file maplibre-gl ships next to itself instead
  // Build only: under Vitest the empty URL breaks module loading
  ...(process.env.VITEST ? {} : { define: { 'import.meta.url': '""' } }),
  optimizeDeps: { exclude: ['maplibre-gl'] },
  test: {
    include: ['tests/**/*.test.ts'],

  },
})
