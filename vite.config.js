import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import path from 'path'

export default defineConfig({
  server: {
    port: 5173, // [修复] 固定端口，防止随机分配导致 Electron 连不上
    strictPort: true,
  },
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'electron/main/index.js',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron', 'robotjs']
            }
          }
        }
      },
      preload: {
        input: 'electron/preload/index.js',
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
