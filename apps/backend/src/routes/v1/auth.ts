import { Router } from "express";
import rateLimit from "express-rate-limit";
import { SigninSchema, SignupSchema } from "../../types/index.js";
import { hash, compare } from "../../s_crypt.js";
import prisma from "@trakx/db";
import { generateAccessToken, generateRefreshToken, verifyToken } from "../../util.js";
import { authMiddleware } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { logger } from "../../utils/logger.js";
import crypto from "node:crypto";

const router = Router();

// ─── Auth-specific rate limiter: 10 requests per 15 minutes per IP ───────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});

// ─── POST /auth/register ──────────────────────────────────────────────────────
router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsedData = SignupSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ error: "Invalid data", issues: parsedData.error.issues });
    }

    const hashedPassword = await hash(parsedData.data.password);

    const user = await prisma.user.create({
      data: {
        name: parsedData.data.name,
        email: parsedData.data.email,
        passwordHash: hashedPassword,
      },
      select: { id: true, name: true, email: true },
    }).catch((error: { code?: string }) => {
      if (error?.code === "P2002") {
        const err = Object.assign(new Error("User already exists"), { status: 409 });
        throw err;
      }
      throw error;
    });

    const accessToken = generateAccessToken({ userId: user.id });
    const { token: refreshToken, expiresAt } = generateRefreshToken();

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    logger.info({ userId: user.id }, "user registered");

    return res.status(201).json({
      message: "User created successfully",
      userId: user.id,
      token: accessToken,
      refreshToken,
    });
  })
);

// ─── POST /auth/login ─────────────────────────────────────────────────────────
router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = SigninSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", issues: parsed.error.issues });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      // Return same message for missing user and wrong password to prevent user enumeration
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await compare(parsed.data.password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = generateAccessToken({ userId: user.id });
    const { token: refreshToken, expiresAt } = generateRefreshToken();

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    logger.info({ userId: user.id }, "user logged in");

    return res.status(200).json({
      userId: user.id,
      email: user.email,
      token: accessToken,
      refreshToken,
    });
  })
);

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({ error: "refreshToken is required" });
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      // Delete expired token if found
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    // Rotate: delete old token and issue a new pair
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const accessToken = generateAccessToken({ userId: stored.userId });
    const { token: newRefreshToken, expiresAt } = generateRefreshToken();

    await prisma.refreshToken.create({
      data: { userId: stored.userId, token: newRefreshToken, expiresAt },
    });

    return res.json({ token: accessToken, refreshToken: newRefreshToken });
  })
);

// ─── POST /auth/logout ────────────────────────────────────────────────────────
router.post(
  "/logout",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken, userId: req.user!.userId },
      });
    }
    logger.info({ userId: req.user!.userId }, "user logged out");
    return res.json({ message: "Logged out successfully" });
  })
);

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  })
);

export default router;
