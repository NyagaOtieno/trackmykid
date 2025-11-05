import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: ".",                // project root
  base: "./",               // relative paths for Vercel
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // allows import like "@/components/..."
    },
  },
  build: {
    outDir: "dist",         // production build folder
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "public/index.html"), // ensures correct HTML entry
    },
  },
});
