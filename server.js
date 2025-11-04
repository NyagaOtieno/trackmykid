// api/server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createVercelServer } from "vercel-node-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static assets
app.use(express.static(path.join(__dirname, "../dist")));

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

// Export as serverless function
export default createVercelServer(app);
