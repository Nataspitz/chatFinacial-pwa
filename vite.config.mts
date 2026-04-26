import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  root: projectRoot,
  cacheDir: fileURLToPath(new URL('./node_modules/.vite', import.meta.url)),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'icons/app-icon.svg',
        'icons/app-icon-192.png',
        'icons/app-icon-512.png',
        'icons/app-icon-maskable-512.png',
        'icons/apple-touch-icon.png'
      ],
      manifest: {
        id: '/',
        name: 'ChatFinacial Mobile',
        short_name: 'CF Mobile',
        description: 'PWA mobile para chat, dashboard e calendario financeiro.',
        theme_color: '#254edb',
        background_color: '#f9fafb',
        orientation: 'portrait',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        categories: ['finance', 'business', 'productivity'],
        prefer_related_applications: false,
        icons: [
          {
            src: '/icons/app-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/app-icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    css: true,
    setupFiles: ['./__test__/setup.ts'],
    include: ['__test__/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      reportsDirectory: './coverage'
    }
  }
})
