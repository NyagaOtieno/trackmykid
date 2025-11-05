import express from "express";
import cors from "cors";

// Import your routes here
// Example: import usersRouter from './routes/users.js';
// Adjust according to your project structure
// import apiRoute1 from './routes/route1.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -----------------------------
// API ROUTES
// -----------------------------

// Example API route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Vercel!" });
});

// Add your original routes here
// e.g., app.use("/api/users", usersRouter);

// -----------------------------
// CATCH-ALL ROUTE
// -----------------------------

// This will handle any request that doesn't match an API route
app.all("*", (req, res) => {
  res.status(200).send(`Path "${req.path}" not handled by API`);
});

// -----------------------------
// VERCEL EXPORT
// -----------------------------

// ⚠️ Important: Do NOT use app.listen() in Vercel
export default app;
