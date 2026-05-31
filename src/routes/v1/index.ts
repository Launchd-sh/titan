import Elysia from "elysia";
import { authRoutes } from "./auth";
import { meRoute } from "./me";
import { orgRoutes } from "./orgs";
import { projectRoutes } from "./projects";

export const v1router = new Elysia()
  .use(authRoutes)
  .use(meRoute)
  .use(orgRoutes)
  .use(projectRoutes);
