import Elysia from "elysia";
import { authRoutes } from "./auth";
import { meRoute } from "./me";

export const routes = new Elysia().use(authRoutes).use(meRoute);
