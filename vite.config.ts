import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react({
      babel: {
        // Keep large generated JSX output compact so Babel does not emit its
        // 500 KB formatting de-optimisation notice for the app shell.
        generatorOpts: { compact: true },
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    // Pinned. Without strictPort, a stale dev server makes Vite silently move to 5174, and the
    // share/lease links the API emails (built from PUBLIC_APP_URL) then point at the wrong port.
    port: 5173,
    strictPort: true,

    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: (proxy) => {
          // Without this, a stopped API surfaces as a bare ECONNREFUSED in the terminal and a
          // failed fetch in the browser, with nothing saying which process is missing.
          proxy.on('error', (err: NodeJS.ErrnoException, _req, res) => {
            const down = err.code === 'ECONNREFUSED'
            if (down) {
              console.error(
                '\n  API server is not running on :5000 — run `npm run dev:all` (not `npm run dev`).\n'
              )
            }
            const out = res as import('node:http').ServerResponse
            if (out && typeof out.writeHead === 'function' && !out.headersSent) {
              out.writeHead(down ? 503 : 502, { 'Content-Type': 'application/json' })
              out.end(
                JSON.stringify({
                  success: false,
                  error: down
                    ? 'API server is not running. Start both processes with: npm run dev:all'
                    : `Could not reach the API: ${err.message}`,
                })
              )
            }
          })
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
