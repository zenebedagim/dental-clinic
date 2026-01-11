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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React and React DOM into separate chunk
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // Split Socket.io into separate chunk
          "socket-vendor": ["socket.io-client"],
          // Split Axios into separate chunk
          "axios-vendor": ["axios"],
        },
      },
    },
    // Increase chunk size warning limit to 600KB (optional, but we're fixing the root cause)
    chunkSizeWarningLimit: 600,
  },
});
