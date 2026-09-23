import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      legacy({
        targets: ['defaults', 'not IE 11', 'iOS >= 11'],
        polyfills: ['es.promise.finally', 'es/array/at'],
        modernPolyfills: ['es.promise.finally', 'es/array/at']
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'mask-icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        manifest: {
          name: 'Task Molly',
          short_name: 'Task Molly',
          description: 'Premium domestic services platform for Kenya',
          theme_color: '#AE9573',
          background_color: '#AE9573',
          display: 'standalone',
          icons: [
            {
              src: 'mask-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      target: 'safari11'
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
