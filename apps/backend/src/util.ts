import jwt from "jsonwebtoken";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  return secret;
};

export const generateToken = (payload: any) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
};

export const verifyToken = (
  token: string
): { userId: string; [key: string]: any } => {
  const decoded = jwt.verify(token, getJwtSecret());
  if (typeof decoded === "string") {
    throw new Error("Invalid token format");
  }
  return decoded as { userId: string; [key: string]: any };
};
