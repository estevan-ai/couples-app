import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo.png', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: "The Couple's Currency",
        short_name: "Couple's Currency",
        description: "Investing in Us.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        importScripts: ['firebase-messaging-sw.js'], // Import FCM script
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      devOptions: {
        enabled: true,
        type: 'module' // usage with prompt-update usually needs module type in dev
      }
    })
  ],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
