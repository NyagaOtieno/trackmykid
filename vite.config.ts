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
  base: "/", // Set base path for deployment; change if deploying under a subfolder
  server: {
    open: true, // Opens browser automatically on dev
    port: 5173, // Dev server port
    strictPort: true, // Fail if port is taken
    proxy: {
      // Proxy API calls to backend during development
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "/api"), // optional, keeps path
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true, // Optional: useful for debugging
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"), // SPA entry
      output: {
        manualChunks: {
          react: ["react", "react-dom"], // Split vendor chunk
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`, // Auto import SCSS variables
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"], // Pre-bundle dependencies
  },
});
