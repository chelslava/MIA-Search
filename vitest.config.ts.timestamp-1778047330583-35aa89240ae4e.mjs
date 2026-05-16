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
    testTimeout: 1e4,
    hookTimeout: 1e4,
    reporters: ["basic"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.git/**"]
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9tbnQvZC9SZXBvL01JQS1TZWFyY2hcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9tbnQvZC9SZXBvL01JQS1TZWFyY2gvdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vbW50L2QvUmVwby9NSUEtU2VhcmNoL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZXN0L2NvbmZpZ1wiO1xuaW1wb3J0IHByZWFjdCBmcm9tIFwiQHByZWFjdC9wcmVzZXQtdml0ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcHJlYWN0KCldLFxuICB0ZXN0OiB7XG4gICAgZW52aXJvbm1lbnQ6IFwianNkb21cIixcbiAgICBzZXR1cEZpbGVzOiBbXCIuL3NyYy90ZXN0L3NldHVwLnRzXCJdLFxuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgY3NzOiBmYWxzZSxcbiAgICB0ZXN0VGltZW91dDogMTAwMDAsXG4gICAgaG9va1RpbWVvdXQ6IDEwMDAwLFxuICAgIHJlcG9ydGVyczogW1wiYmFzaWNcIl0sXG4gICAgZXhjbHVkZTogW1wiKiovbm9kZV9tb2R1bGVzLyoqXCIsIFwiKiovZGlzdC8qKlwiLCBcIioqLy5naXQvKipcIl1cbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXdQLFNBQVMsb0JBQW9CO0FBQ3JSLE9BQU8sWUFBWTtBQUVuQixJQUFPLHdCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsT0FBTyxDQUFDO0FBQUEsRUFDbEIsTUFBTTtBQUFBLElBQ0osYUFBYTtBQUFBLElBQ2IsWUFBWSxDQUFDLHFCQUFxQjtBQUFBLElBQ2xDLFNBQVM7QUFBQSxJQUNULEtBQUs7QUFBQSxJQUNMLGFBQWE7QUFBQSxJQUNiLGFBQWE7QUFBQSxJQUNiLFdBQVcsQ0FBQyxPQUFPO0FBQUEsSUFDbkIsU0FBUyxDQUFDLHNCQUFzQixjQUFjLFlBQVk7QUFBQSxFQUM1RDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
