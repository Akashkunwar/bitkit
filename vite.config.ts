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
          'Images to PDF, PDF to images, Word to image, Markdown to PDF, calculators, converters, and more. Everything runs locally in your browser.',
        theme_color: '#0e0f0c',
        background_color: '#0e0f0c',
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
            files: [
              {
                name: 'media',
                accept: ['image/*', 'application/pdf', 'text/*', 'application/json', '.csv', '.docx', '.heic', '.heif'],
              },
            ],
          },
        },
        file_handlers: [
          {
            action: '/share',
            accept: {
              'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic', '.heif', '.avif'],
              'application/pdf': ['.pdf'],
              'text/plain': ['.txt', '.md', '.csv'],
              'text/markdown': ['.md'],
              'text/csv': ['.csv'],
              'application/json': ['.json'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
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
          '**/*heic*',
          '**/libheif*',
          '**/vision_bundle*',
          '**/ort-wasm*',
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
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/(?:tesseract|@mediapipe|onnxruntime-web@)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kit-cdn-engines',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern:
              /^https:\/\/(?:tessdata\.projectnaptha\.com|storage\.googleapis\.com\/mediapipe-models|huggingface\.co\/sahilmahendrakar|cdn\.jsdelivr\.net\/gh\/(?:sahilmahendrakar|hexgrad))\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kit-cdn-models',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 60 },
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
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
})
