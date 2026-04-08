import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
        name: 'ChatFinacial Mobile',
        short_name: 'CF Mobile',
        description: 'PWA mobile para chat, dashboard e calendario financeiro.',
        theme_color: '#254edb',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
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
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: true
  }
})
