import { defineConfig } from 'vitest/config';
import { createTestTransform } from './vitest.shared.ts';

export default defineConfig({
  plugins: [createTestTransform()],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.spec.ts'],
  },
});
