import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [
    svelte({
      hot: false // No hot reload during tests
    })
  ],
  
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules/**', 'build/**', '.svelte-kit/**'],
    
    // Coverage config
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**/*.{js,svelte}'],
      exclude: [
        'src/lib/components/**',  // Don't require tests for UI components yet
        'src/lib/utils/**'        // Utils are tested separately
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50
      }
    },
    
    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000
  },
  
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
      $components: path.resolve(__dirname, 'src/lib/components'),
      $stores: path.resolve(__dirname, 'src/lib/stores'),
      $utils: path.resolve(__dirname, 'src/lib/utils')
    }
  }
});