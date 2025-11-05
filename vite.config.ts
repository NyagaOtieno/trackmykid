import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Enables "@/components/..."
    },
  },
  server: {
    open: true, // Automatically opens the browser on npm run dev
  },
  build: {
    outDir: "dist",          // Output directory for build
    emptyOutDir: true,       // Clears old builds
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"), // Root index.html for SPA
    },
  },
});
