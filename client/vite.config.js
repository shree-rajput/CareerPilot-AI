import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'monaco-editor/esm/vs/editor/editor.api.js': path.resolve(
        __dirname,
        'node_modules/monaco-editor/esm/vs/editor/editor.api.js'
      ),
      'monaco-editor/esm/vs/editor/editor.api': path.resolve(
        __dirname,
        'node_modules/monaco-editor/esm/vs/editor/editor.api.js'
      ),
      'y-protocols/awareness': path.resolve(
        __dirname,
        'node_modules/y-protocols/awareness.js'
      ),
    },
  },
  optimizeDeps: {
    include: ['yjs', 'y-monaco', 'monaco-editor']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-vendor': ['monaco-editor', '@monaco-editor/react'],
          'recharts-vendor': ['recharts'],
          'livekit-vendor': ['livekit-client', '@livekit/components-react'],
          'vendor': ['react', 'react-dom', 'react-router-dom', 'axios', 'lucide-react']
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
