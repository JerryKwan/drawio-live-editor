import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['drawio-live-editor', 'drawio-live-editor-dev']
  },
  preview: { port: 3000, host: true },
  plugins: [svelte(), tailwindcss()],
  resolve: {
    alias: {
      '$app/environment': './src/lib/mocks/app-environment.ts',
    }
  },
})
