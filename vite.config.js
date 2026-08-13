import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      // Makes service worker available in dev mode
      devOptions: {
        enabled: false // Set to true if you want to test PWA locally
      },
      // Include these files in the precache
      includeAssets: [
        'favicon.svg',
        'favicon.png',
        'icons/icon-192.png',
        'icons/icon-512.png'
      ],
      manifest: {
        name: 'Floorish',
        short_name: 'Floorish',
        description: 'Draw your home. Arrange your furniture. Free and open source.',
        theme_color: '#1E3D1E',
        background_color: '#FAF8F4',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        categories: ['home', 'design', 'productivity'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Create Home',
            short_name: 'New',
            description: 'Create a new home',
            url: '/?new=true',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'My Inventory',
            short_name: 'Inventory',
            description: 'View your furniture inventory',
            url: '/inventory',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        // Cache only what the app actually uses
        globPatterns: [
          '**/*.{js,css,html,svg,png,ico,webp,woff2}'
        ],
        globIgnores: [
          '**/node_modules/**',
          '**/build/**',
          '**/.svelte-kit/**'
        ],
        // Cache app shell immediately
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Don't cache large Three.js/Fabric.js chunks
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        // Clean up old caches
        cleanupOutdatedCaches: true,
        // Skip waiting and activate immediately
        skipWaiting: true,
        clientsClaim: true
      }
    })
  ],
  // Optimize build for mobile
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy libraries into separate chunks
          three: ['three'],
          fabric: ['fabric']
        }
      }
    }
  },
  // Better dev experience
  server: {
    host: true,
    port: 5173
  }
});