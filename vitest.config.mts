import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: { GROQ_API_KEY: "", UPSTASH_REDIS_REST_URL: "", KV_REST_API_URL: "" },
  },
});
