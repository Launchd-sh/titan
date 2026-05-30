import { Elysia } from "elysia";
import { config } from "./config";
import { db } from "./db";
import { routes } from "./routes";

await db.$connect();

const app = new Elysia()
  .get("/ping", () => "pong")
  .use(routes)
  .listen(config.port);

console.log(`Listening on http://localhost:${app.server?.port}`);
