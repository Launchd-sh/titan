import { Elysia } from "elysia";
import { config } from "$src/config";
import { db } from "$src/db";
import { v1router } from "$routes/v1";

await db.$connect();

const app = new Elysia()
  .get("/ping", () => "pong")

  // v1 of the API
  .group("/api/v1", (r) => r.use(v1router))
  .listen(config.port);

console.log(`Listening on http://localhost:${app.server?.port}`);
