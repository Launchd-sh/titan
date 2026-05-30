import Elysia, { t } from "elysia";
import { db } from "$src/db";
import { authMiddleware } from "$middleware/auth";

const OWNER_ROLE = "owner";

async function getMembership(userId: string, organizationId: string) {
  return db.organizationMember.findFirst({
    where: { userId, organizationId },
    select: { id: true, role: true, organizationId: true },
  });
}

export const projectRoutes = new Elysia({ prefix: "/projects" })
  .use(authMiddleware)
  .get(
    "/:project_id",
    async ({ params, session, status }) => {
      const project = await db.project.findUnique({
        where: { id: params.project_id },
        select: {
          id: true,
          organizationId: true,
          name: true,
          slug: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!project) return status(404, { error: "project not found" });

      const membership = await getMembership(session!.user.id, project.organizationId);
      if (!membership) return status(404, { error: "project not found" });

      return project;
    },
    {
      params: t.Object({
        project_id: t.String({ format: "uuid" }),
      }),
    },
  )
  .patch(
    "/:project_id",
    async ({ params, body, session, status }) => {
      const project = await db.project.findUnique({
        where: { id: params.project_id },
        select: { id: true, organizationId: true },
      });
      if (!project) return status(404, { error: "project not found" });

      const membership = await getMembership(session!.user.id, project.organizationId);
      if (!membership) return status(404, { error: "project not found" });
      if (membership.role !== OWNER_ROLE) return status(403, { error: "forbidden" });

      if (body.slug) {
        const existingSlug = await db.project.findFirst({
          where: {
            organizationId: project.organizationId,
            slug: body.slug,
            id: { not: project.id },
          },
          select: { id: true },
        });
        if (existingSlug)
          return status(409, { error: "project slug already exists in organization" });
      }

      const updated = await db.project.update({
        where: { id: project.id },
        data: {
          name: body.name,
          slug: body.slug,
          description: body.description,
        },
        select: {
          id: true,
          organizationId: true,
          name: true,
          slug: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updated;
    },
    {
      params: t.Object({
        project_id: t.String({ format: "uuid" }),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        slug: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.Nullable(t.String())),
      }),
    },
  )
  .delete(
    "/:project_id",
    async ({ params, session, set, status }) => {
      const project = await db.project.findUnique({
        where: { id: params.project_id },
        select: { id: true, organizationId: true },
      });
      if (!project) return status(404, { error: "project not found" });

      const membership = await getMembership(session!.user.id, project.organizationId);
      if (!membership) return status(404, { error: "project not found" });
      if (membership.role !== OWNER_ROLE) return status(403, { error: "forbidden" });

      await db.project.delete({ where: { id: project.id } });
      set.status = 204;
    },
    {
      params: t.Object({
        project_id: t.String({ format: "uuid" }),
      }),
    },
  );
