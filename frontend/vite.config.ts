import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      // Ini adalah kunci untuk memastikan 'near-api-js' menggunakan polyfill Buffer
      buffer: 'buffer',
      process: 'process/browser',
    },
  },
  build: {
    target: 'esnext',
  },
})