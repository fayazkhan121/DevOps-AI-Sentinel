import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: true,
    port: 5173
  },
  optimizeDeps: {
    exclude: ['@tensorflow/tfjs'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
        module: 'globalThis'
      }
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts'],
          monitoring: ['@aws-sdk/client-cloudwatch', '@azure/identity', '@google-cloud/monitoring']
        }
      }
    }
  },
  define: {
    'global': 'globalThis',
    'module': 'globalThis',
    'process.env': {}
  }
});