import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { logger } from "./utils/logger";
import resumeRoutes from "./routes/resume";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/resumes", resumeRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`API endpoints:`);
  logger.info(`  POST /api/resumes/upload`);
  logger.info(`  POST /api/resumes/:id/process`);
  logger.info(`  GET  /api/resumes/:id/status`);
  logger.info(`  GET  /api/resumes/:id/csv`);
  logger.info(`  GET  /api/resumes`);
});

export default app;
