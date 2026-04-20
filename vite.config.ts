import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl()],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
