import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'share-handler.js'],
      manifest: {
        name: 'BitKit — private browser tools',
        short_name: 'BitKit',
        description:
          'Compress images, shrink PDFs, clean CSVs, make charts, trim video, and more. Everything runs locally in your browser.',
        theme_color: '#0d1413',
        background_color: '#0d1413',
        display: 'standalone',
        orientation: 'any',
        categories: ['utilities', 'productivity', 'developer'],
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [{ name: 'media', accept: ['image/*', 'application/pdf', 'text/*', 'application/json'] }],
          },
        },
        file_handlers: [
          {
            action: '/share',
            accept: {
              'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
              'application/pdf': ['.pdf'],
              'text/plain': ['.txt', '.md'],
              'text/markdown': ['.md'],
              'application/json': ['.json'],
            },
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,ico}'],
        // The heavy single-tool engines (Mermaid, OCR, PDF, segmentation) would
        // otherwise force every first-time visitor to download several extra
        // megabytes for tools they may never open. They are cached on first use
        // instead, which still leaves them available offline afterwards.
        globIgnores: [
          '**/mermaid*',
          '**/cytoscape*',
          '**/cynefin*',
          '**/katex*',
          '**/tesseract*',
          '**/pdf.worker*',
          '**/vision_bundle*',
          '**/*dagre*',
        ],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(?:js|css|wasm|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kit-lazy-chunks',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: '/index.html',
        importScripts: ['share-handler.js'],
        navigateFallbackDenylist: [/^\/share-target/],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  worker: {
    format: 'es',
  },
})
