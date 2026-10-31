import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "./",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-data": ["dexie", "@supabase/supabase-js"]
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
