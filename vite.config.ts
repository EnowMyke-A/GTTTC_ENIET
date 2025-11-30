import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 // 4 MB, adjust as needed
      },

      includeAssets: [
        'favicon-96x96.png',
        'favicon.ico',
        'favicon.svg',
        'apple-touch-icon.png'
      ],

      manifest: {
        name: 'GTTTC Report',
        short_name: 'GTTTC Report',
        description: 'An Automated Report Generation Software for GTTTC Kumba',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  // Enable history API fallback for client-side routing
  preview: {
    port: 8080,
    host: "::",
  },
}));