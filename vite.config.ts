import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Allows "@/components/..."
    },
  },
  base: "/", // Base path, adjust if deploying under subfolder
  server: {
    open: true, // Opens browser automatically on dev
    port: 5173, 
    proxy: {
      // Proxy for local backend (e.g., Node.js)
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      // Proxy for Railway production API
      "/railway-api": {
        target: "https://mytrack-production.up.railway.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/railway-api/, ""),
        secure: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true, // Generate source maps for debugging
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"), // SPA entry
      output: {
        manualChunks: {
          // Split vendor chunks
          react: ["react", "react-dom"],
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`, // Auto-import SCSS variables
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"], // Pre-bundle dependencies
  },
});
