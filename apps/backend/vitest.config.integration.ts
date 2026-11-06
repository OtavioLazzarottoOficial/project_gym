import { defineConfig } from 'vitest/config';
import { createTestTransform } from './vitest.shared.ts';

export default defineConfig({
  plugins: [createTestTransform()],
  resolve: { tsconfigPaths: true },
  test: {
    root: './',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.integration-spec.ts'],
    hookTimeout: 30000,
    testTimeout: 15000,
  },
});
