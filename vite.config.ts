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
  define: {
    'process.env': {}, // Define process.env as an empty object to avoid errors
  },
  optimizeDeps: {
    include: ['@tensorflow/tfjs'],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts'],
          tensorflow: ['@tensorflow/tfjs']
        }
      }
    }
  }
});
