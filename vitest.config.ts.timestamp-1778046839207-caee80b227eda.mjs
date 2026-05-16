// vitest.config.ts
import { defineConfig } from "file:///mnt/d/Repo/MIA-Search/node_modules/.pnpm/vitest@2.1.9_jsdom@26.1.0/node_modules/vitest/dist/config.js";
import preact from "file:///mnt/d/Repo/MIA-Search/node_modules/.pnpm/@preact+preset-vite@2.10.5_@babel+core@7.29.0_preact@10.29.1_rollup@4.60.3_vite@6.4.2_jiti@1.21.7_/node_modules/@preact/preset-vite/dist/esm/index.mjs";
var vitest_config_default = defineConfig({
  plugins: [preact()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    css: false,
    testTimeout: 2e4,
    hookTimeout: 2e4
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9tbnQvZC9SZXBvL01JQS1TZWFyY2hcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9tbnQvZC9SZXBvL01JQS1TZWFyY2gvdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vbW50L2QvUmVwby9NSUEtU2VhcmNoL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZXN0L2NvbmZpZ1wiO1xuaW1wb3J0IHByZWFjdCBmcm9tIFwiQHByZWFjdC9wcmVzZXQtdml0ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcHJlYWN0KCldLFxuICB0ZXN0OiB7XG4gICAgZW52aXJvbm1lbnQ6IFwianNkb21cIixcbiAgICBzZXR1cEZpbGVzOiBbXCIuL3NyYy90ZXN0L3NldHVwLnRzXCJdLFxuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgY3NzOiBmYWxzZSxcbiAgICB0ZXN0VGltZW91dDogMjAwMDAsXG4gICAgaG9va1RpbWVvdXQ6IDIwMDAwXG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3UCxTQUFTLG9CQUFvQjtBQUNyUixPQUFPLFlBQVk7QUFFbkIsSUFBTyx3QkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE9BQU8sQ0FBQztBQUFBLEVBQ2xCLE1BQU07QUFBQSxJQUNKLGFBQWE7QUFBQSxJQUNiLFlBQVksQ0FBQyxxQkFBcUI7QUFBQSxJQUNsQyxTQUFTO0FBQUEsSUFDVCxLQUFLO0FBQUEsSUFDTCxhQUFhO0FBQUEsSUFDYixhQUFhO0FBQUEsRUFDZjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
