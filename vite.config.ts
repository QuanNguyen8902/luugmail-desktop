import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  base: './',
  define: {
    // Define __dirname for browser compatibility
    '__dirname': JSON.stringify('.'),
  },
});
