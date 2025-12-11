import { Router } from "express";
import { SigninSchema } from "../../types/index.js";
import { SignupSchema } from "../../types/index.js";
import { hash, compare } from "../../s_crypt.js";
import prisma from "@trakx/db";
import { generateToken, verifyToken } from "../../util.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = Router();

// POST /auth/register
router.post("/register", async (req, res) => {
  const parsedData = SignupSchema.safeParse(req.body);
  if (!parsedData.success) {
    console.log("no pared data");

    return res
      .status(400)
      .json({ error: "Invalid data", issues: parsedData.error.issues });
  }
  // Hash the plain password from the request; DB field is passwordHash
  const hashedPassword = await hash(parsedData.data.passwordHash);
  try {
    const user = await prisma.user.create({
      data: {
        name: parsedData.data.name,
        email: parsedData.data.email,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const token = generateToken({ userId: user.id });
    res.status(201).json({
      message: "User created successfully",
      userId: user.id,
      token: token,
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      // Prisma unique constraint violation
      return res.status(400).json({ message: "User already exists" });
    }
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const parsed = SigninSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid data", issues: parsed.error.issues });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: parsed.data.email,
      },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isPasswordValid = await compare(
      parsed.data.passwordHash,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken({ userId: user.id });
    res.status(200).json({ userId: user.id, email: user.email, token: token });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
      error: (error as Error).message,
    });
  }
});

export default router;
