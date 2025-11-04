import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, "dist")));

// SPA fallback: serve index.html for all other routes
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
