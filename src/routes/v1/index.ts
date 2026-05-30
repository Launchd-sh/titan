import Elysia from "elysia";
import { authRoutes } from "./auth";
import { meRoute } from "./me";

export const v1router = new Elysia().use(authRoutes).use(meRoute);
