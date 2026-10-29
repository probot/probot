import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/integration/utils.ts", "test/fixtures/**"],
    coverage: {
      provider: "v8",
      exclude: ["test/**"],
    },
  },
})
