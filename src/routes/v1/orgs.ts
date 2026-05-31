import Elysia, { t } from "elysia";
import { db } from "$src/db";
import { authMiddleware } from "$middleware/auth";
import { createAuditLog, parseAuditLogLimit } from "$lib/audit";

const OWNER_ROLE = "owner";

async function getMembership(userId: string, organizationId: string) {
  return db.organizationMember.findFirst({
    where: { userId, organizationId },
    select: { id: true, role: true, organizationId: true },
  });
}

export const orgRoutes = new Elysia({ prefix: "/orgs" })
  .use(authMiddleware)
  .get("/", async ({ session }) => {
    const orgs = await db.organization.findMany({
      where: {
        members: {
          some: { userId: session!.user.id },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return { items: orgs };
  })
  .post(
    "/",
    async ({ body, session, status }) => {
      const existingSlug = await db.organization.findUnique({
        where: { slug: body.slug },
        select: { id: true },
      });
      if (existingSlug)
        return status(409, { error: "organization slug already exists" });

      const org = await db.organization.create({
        data: {
          name: body.name,
          slug: body.slug,
          members: {
            create: {
              userId: session!.user.id,
              role: OWNER_ROLE,
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await createAuditLog({
        organizationId: org.id,
        actorUserId: session!.user.id,
        action: "organization.created",
        targetType: "organization",
        targetId: org.id,
        metadata: {
          name: org.name,
          slug: org.slug,
        },
      });

      return status(201, org);
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        slug: t.String({ minLength: 1 }),
      }),
    },
  )
  .get(
    "/:org_id",
    async ({ params, session, status }) => {
      const membership = await getMembership(session!.user.id, params.org_id);
      if (!membership) return status(404, { error: "organization not found" });

      const org = await db.organization.findUnique({
        where: { id: params.org_id },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!org) return status(404, { error: "organization not found" });
      return org;
    },
    {
      params: t.Object({
        org_id: t.String({ format: "uuid" }),
      }),
    },
  )
  .patch(
    "/:org_id",
    async ({ params, body, session, status }) => {
      const membership = await getMembership(session!.user.id, params.org_id);
      if (!membership) return status(404, { error: "organization not found" });
      if (membership.role !== OWNER_ROLE)
        return status(403, { error: "forbidden" });

      if (body.slug) {
        const existingSlug = await db.organization.findFirst({
          where: {
            slug: body.slug,
            id: { not: params.org_id },
          },
          select: { id: true },
        });
        if (existingSlug)
          return status(409, { error: "organization slug already exists" });
      }

      const org = await db.organization.update({
        where: { id: params.org_id },
        data: {
          name: body.name,
          slug: body.slug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await createAuditLog({
        organizationId: org.id,
        actorUserId: session!.user.id,
        action: "organization.updated",
        targetType: "organization",
        targetId: org.id,
        metadata: {
          name: org.name,
          slug: org.slug,
        },
      });

      return org;
    },
    {
      params: t.Object({
        org_id: t.String({ format: "uuid" }),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        slug: t.Optional(t.String({ minLength: 1 })),
      }),
    },
  )
  .get(
    "/:org_id/projects",
    async ({ params, session, status }) => {
      const membership = await getMembership(session!.user.id, params.org_id);
      if (!membership) return status(404, { error: "organization not found" });

      const projects = await db.project.findMany({
        where: { organizationId: params.org_id },
        select: {
          id: true,
          organizationId: true,
          name: true,
          slug: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "asc" },
      });

      return { items: projects };
    },
    {
      params: t.Object({
        org_id: t.String({ format: "uuid" }),
      }),
    },
  )
  .post(
    "/:org_id/projects",
    async ({ params, body, session, status }) => {
      const membership = await getMembership(session!.user.id, params.org_id);
      if (!membership) return status(404, { error: "organization not found" });
      if (membership.role !== OWNER_ROLE)
        return status(403, { error: "forbidden" });

      const existingSlug = await db.project.findUnique({
        where: {
          organizationId_slug: {
            organizationId: params.org_id,
            slug: body.slug,
          },
        },
        select: { id: true },
      });
      if (existingSlug)
        return status(409, { error: "project slug already exists in organization" });

      const project = await db.project.create({
        data: {
          organizationId: params.org_id,
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

      await createAuditLog({
        organizationId: params.org_id,
        projectId: project.id,
        actorUserId: session!.user.id,
        action: "project.created",
        targetType: "project",
        targetId: project.id,
        metadata: {
          name: project.name,
          slug: project.slug,
        },
      });

      return status(201, project);
    },
    {
      params: t.Object({
        org_id: t.String({ format: "uuid" }),
      }),
      body: t.Object({
        name: t.String({ minLength: 1 }),
        slug: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/:org_id/audit-logs",
    async ({ params, query, session, status }) => {
      const membership = await getMembership(session!.user.id, params.org_id);
      if (!membership) return status(404, { error: "organization not found" });

      const logs = await db.auditLog.findMany({
        where: { organizationId: params.org_id },
        select: {
          id: true,
          organizationId: true,
          projectId: true,
          actorUserId: true,
          action: true,
          targetType: true,
          targetId: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: parseAuditLogLimit(query.limit),
      });

      return { items: logs };
    },
    {
      params: t.Object({
        org_id: t.String({ format: "uuid" }),
      }),
      query: t.Object({
        limit: t.Optional(t.String()),
      }),
    },
  );
