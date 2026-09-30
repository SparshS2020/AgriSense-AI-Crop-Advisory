import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetSessionResponse,
  LoginBody,
  LoginResponse,
  RegisterBody,
  RegisterResponse,
} from "@workspace/api-zod";
import {
  clearSessionCookie,
  hashPassword,
  publicUser,
  setSessionCookie,
  userFromRequest,
  verifyPassword,
} from "../lib/auth";

const router: IRouter = Router();

router.get("/auth/session", async (req, res): Promise<void> => {
  const user = await userFromRequest(req);
  res.json(GetSessionResponse.parse({ authenticated: Boolean(user), user: user ? publicUser(user) : null }));
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    res.status(400).json({ error: "An account with that email already exists." });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    name: parsed.data.name.trim(),
    email,
    passwordHash: await hashPassword(parsed.data.password),
  }).returning();
  setSessionCookie(res, user.id);
  res.status(201).json(RegisterResponse.parse({ authenticated: true, user: publicUser(user) }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email.trim().toLowerCase())).limit(1);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "The email or password is incorrect." });
    return;
  }
  setSessionCookie(res, user.id);
  res.json(LoginResponse.parse({ authenticated: true, user: publicUser(user) }));
});

router.post("/auth/logout", (req, res): void => {
  clearSessionCookie(res);
  res.status(204).send();
});

export default router;