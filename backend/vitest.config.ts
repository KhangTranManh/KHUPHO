import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Tải MongoDB in-memory lần đầu có thể lâu.
    hookTimeout: 120_000,
    testTimeout: 20_000,
    // Các file test dùng chung một instance MongoDB → chạy tuần tự.
    fileParallelism: false,
  },
});
