import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 15000,
    hookTimeout: 15000,
    // Use forks for parallel test execution
    pool: 'forks',
    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,
  },
});
