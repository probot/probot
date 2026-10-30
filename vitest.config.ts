import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/**/*.test.ts"],
          exclude: ["test/integration/**", "test/e2e/**", "test/fixtures/**"],
          isolate: false,
          fileParallelism: true,
        },
      },
      {
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          exclude: ["test/integration/utils.ts", "test/fixtures/**"],
          isolate: false,
          fileParallelism: true,
        },
      },
      {
        test: {
          name: "e2e",
          include: ["test/e2e/**/*.test.ts"],
          exclude: ["test/fixtures/**"],
          isolate: false,
          fileParallelism: true,
        },
      },
    ],
    coverage: {
      provider: "v8",
      exclude: ["test/**"],
    },
  },
});
