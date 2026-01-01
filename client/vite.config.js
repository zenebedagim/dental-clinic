import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Clear cache on startup to avoid module resolution issues
  clearScreen: false,
  // Optimize dependencies
  optimizeDeps: {
    force: true, // Force re-optimization
  },
});
