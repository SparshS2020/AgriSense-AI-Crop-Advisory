import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "agrisense_session";
const JWT_SECRET = process.env.SESSION_SECRET ?? process.env.JWT_SECRET;

type SessionClaims = { sub: string };

declare global {
  namespace Express {
    interface Request {
      currentUser?: User;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setSessionCookie(res: Response, userId: string): void {
  if (!JWT_SECRET) throw new Error("SESSION_SECRET is not configured");
  const token = jwt.sign({ sub: userId } satisfies SessionClaims, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax" });
}

export async function userFromRequest(req: Request): Promise<User | null> {
  if (!JWT_SECRET) return null;
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) return null;
  try {
    const claims = jwt.verify(token, JWT_SECRET) as SessionClaims;
    if (!claims.sub) return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, claims.sub)).limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await userFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }
  req.currentUser = user;
  next();
}

export function publicUser(user: User): { id: string; name: string; email: string } {
  return { id: user.id, name: user.name, email: user.email };
}