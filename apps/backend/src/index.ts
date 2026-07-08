import dotenv from "dotenv";
dotenv.config();

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import apiRoutes from "./routes/v1/index.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { logger } from "./utils/logger.js";
import prisma from "@trakx/db";

const app = express();

// ─── Security: Request ID (must be first for log correlation) ────────────────
app.use(requestIdMiddleware);

// ─── Security: Helmet (HTTP security headers) ────────────────────────────────
// Sets X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, etc.
app.use(helmet());

// ─── Security: CORS (explicit allowlist only) ────────────────────────────────
// The mobile app communicates via the local IP/Expo host, not a browser origin.
// We allow any origin that the mobile SDK sends (which is typically none for
// native apps), while blocking browser-based cross-origin requests.
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Native mobile apps don't send an Origin header — always allow
      if (!origin) return callback(null, true);
      // Allow explicitly whitelisted browser origins
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ─── Global Rate Limiting ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: (req) => req.path === "/healthz",
});
app.use(globalLimiter);

// ─── Request Logging ─────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ requestId: req.requestId, method: req.method, path: req.path }, "incoming request");
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/healthz", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      db: "connected",
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? "1.0.0",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: "degraded", db: "disconnected" });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/v1", apiRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must have 4 params so Express recognises it as an error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(
    { requestId: req.requestId, err: err.message, stack: err.stack },
    "unhandled error"
  );

  // Never leak internal error details to the client
  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : err.message,
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 5050);
app.listen(PORT, () => {
  logger.info({ port: PORT }, `TrakX API running`);
});
