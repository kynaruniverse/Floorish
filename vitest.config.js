import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,svelte}']
    }
  },
  resolve: {
    alias: {
      $lib: '/src/lib',
      $components: '/src/lib/components',
      $stores: '/src/lib/stores',
      $utils: '/src/lib/utils'
    }
  }
});