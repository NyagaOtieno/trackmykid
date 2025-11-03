import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import history from "connect-history-api-fallback";

const app = express();
const PORT = process.env.PORT || 8080;

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use history middleware BEFORE static file middleware
app.use(
  history({
    rewrites: [
      { from: /^\/$/, to: "/index.html" },  // Handle root route
      { from: /^\/.*$/, to: "/index.html" },  // Handle all other routes
    ],
  })
);

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, "dist")));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
