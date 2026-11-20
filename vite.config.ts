/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages liefert die App unter https://<user>.github.io/KompositionTrainer/ aus.
const base = process.env.BASE_PATH ?? '/KompositionTrainer/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(
      `${process.env.npm_package_version ?? '0.0.0'}${process.env.GITHUB_SHA ? '+' + process.env.GITHUB_SHA.slice(0, 7) : ''}`,
    ),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg'],
      manifest: {
        name: 'KompositionsTrainer',
        short_name: 'Komposition',
        description: 'Komponieren klassischer Musik von Grund auf lernen',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#faf7f0',
        theme_color: '#3b2f63',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Klaviersamples mit cachen, damit die Wiedergabe offline funktioniert.
        globPatterns: ['**/*.{js,css,html,svg,png,mp3,json}'],
        // Instrumentenklänge (über 4 MB) erst laden, wenn sie gebraucht werden, dann offline behalten
        globIgnores: ['**/samples/instrumente/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/samples\/instrumente\//,
            handler: 'CacheFirst',
            options: { cacheName: 'instrumente', expiration: { maxEntries: 200 } },
          },
        ],
      },
    }),
  ],
  build: {
    // VexFlow mit Notenschrift Bravura ist allein knapp 1 MB groß
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
