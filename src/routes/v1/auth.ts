import Elysia, { t } from "elysia";
import { db } from "$src/db";
import { generateSessionToken, hashToken } from "$lib/tokens";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/signup",
    async ({ body, status }) => {
      const existing = await db.user.findFirst({
        where: { OR: [{ username: body.username }, { email: body.email }] },
      });
      if (existing)
        return status(409, { error: "username or email already taken" });

      const passwordHash = await Bun.password.hash(body.password, {
        algorithm: "argon2id",
      });
      const user = await db.user.create({
        data: { username: body.username, email: body.email, passwordHash },
        select: { id: true, username: true, email: true, createdAt: true },
      });

      const { raw, hashed } = generateSessionToken();
      await db.session.create({ data: { userId: user.id, tokenHash: hashed } });

      return status(201, { session_token: raw, token_type: "Bearer", user });
    },
    {
      body: t.Object({
        username: t.String({ minLength: 1 }),
        email: t.String({ minLength: 1 }),
        password: t.String({ minLength: 8 }),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, status }) => {
      const user = await db.user.findUnique({
        where: { username: body.username },
      });
      if (!user) return status(401, { error: "invalid credentials" });

      const valid = await Bun.password.verify(body.password, user.passwordHash);
      if (!valid) return status(401, { error: "invalid credentials" });

      const { raw, hashed } = generateSessionToken();
      await db.session.create({ data: { userId: user.id, tokenHash: hashed } });

      return { session_token: raw, token_type: "Bearer" };
    },
    {
      body: t.Object({
        username: t.String({ minLength: 1 }),
        password: t.String({ minLength: 1 }),
      }),
    },
  )
  .post("/logout", async ({ headers, set }) => {
    const authorization = headers["authorization"] ?? "";
    if (!authorization.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const result = await db.session.deleteMany({
      where: { tokenHash: hashToken(authorization.slice(7)) },
    });

    if (result.count === 0) {
      set.status = 401;
      return { error: "invalid session" };
    }

    set.status = 204;
  });
