import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import history from "connect-history-api-fallback";

const app = express();
const PORT = process.env.PORT || 8080;

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Use history fallback BEFORE static middleware
app.use(
  history({
    // Optional: only rewrite non-API requests
    rewrites: [
      { from: /^\/$/, to: "/index.html" },
      { from: /^\/.*$/, to: "/index.html" },
    ],
  })
);

// ✅ Serve static files from Vite build
app.use(express.static(path.join(__dirname, "dist")));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
