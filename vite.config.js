/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Gera /firebase-messaging-sw.js (push do chat) a partir do modelo em src/sw com a config do Firebase. */
function firebaseMessagingSw(env) {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: env.VITE_FIREBASE_APP_ID,
  }
  const codigo = () => readFileSync(resolve(process.cwd(), 'src/sw/firebase-messaging-sw.template.js'), 'utf-8').replace('__FIREBASE_CONFIG__', JSON.stringify(config))
  return {
    name: 'demop-firebase-messaging-sw',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] === '/firebase-messaging-sw.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(codigo()); return }
        next()
      })
    },
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'firebase-messaging-sw.js', source: codigo() }) },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    firebaseMessagingSw(loadEnv(mode, process.cwd(), '')),
    // PWA: manifesto + service worker (base do app Android via TWA)
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['icons/*.png', '.well-known/assetlinks.json'],
      manifest: {
        id: '/',
        name: 'DEMOP GOCG',
        short_name: 'DEMOP GOCG',
        description: 'Controle de cautela, estoque e manutenção de materiais do DEMOP - GOCG / CBMERJ',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1e3a5f',
        theme_color: '#1e3a5f',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache apenas o app (shell + chunks). Dados do Firebase nunca passam pelo cache.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        globIgnores: ['**/firebase-messaging-sw.js'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__\//, /^\/\.well-known\//, /^\/firebase-messaging-sw\.js$/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          'vendor-charts': ['recharts'],
        },
      }
    }
  },
  server: {
    historyApiFallback: true
  }
}))
