import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "./", // root folder
  build: {
    outDir: "dist",
    rollupOptions: {
      input: path.resolve(__dirname, "index.html")
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  }
});
