import { defineConfig } from 'vite'
import fs from 'fs'

// --- Lire le nom du projet dans package.json ---
const pkg = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url)),
)
const appName = pkg.name || 'app'

// --- Export de la config Vite avec fonction pour récupérer le mode ---
export default defineConfig(({ mode }) => {
  console.log('**************************=>', mode.trim())

  const isProd = mode.trim() === 'production'
  const isDebug = !isProd
  const base = isProd ? `/${appName}/` : '/'

  console.log('production:', isProd)
  console.log('base:', base)

  return {
    server: {
      port: 5173,
      strictPort: true,
    },
    base: base,
    define: {
      __DEBUG__: JSON.stringify(isDebug),
      __BASE__: JSON.stringify(base),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['pdf-lib'], // dépendances à isoler
          },
        },
      },
    },
  }
})
