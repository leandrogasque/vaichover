import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Será que vai chover?',
        short_name: 'Vai chover?',
        description:
          'Clima hiperlocal com alerta rápido de chuva e temperatura em tempo real, agora disponível offline.',
        start_url: '/',
        display: 'standalone',
        background_color: '#e2e8f0',
        theme_color: '#1e3a8a',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo-data',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/geocoding-api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo-geocoding',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\.bigdatacloud\.net\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'bigdatacloud-geocode',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true,
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev'],
  },
})
