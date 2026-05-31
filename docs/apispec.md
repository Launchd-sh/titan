# Titan API Specification (for Claude)

This document describes the current API surface implemented in this repository.

## Base

- Base URL: `http://localhost:3000/api/v1`
- Content-Type: `application/json`
- Auth: Bearer session token from `/auth/signup` or `/auth/login`

Example auth header:

```http
Authorization: Bearer <session_token>
```

## Common Error Shape

Most non-2xx responses return:

```json
{ "error": "message" }
```

Common status codes:

- `400` invalid request body/params
- `401` unauthorized / invalid session
- `403` forbidden
- `404` not found
- `409` conflict

## Data Models

### User (public shape)

```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### Organization

```json
{
  "id": "uuid",
  "name": "string",
  "slug": "string",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### Project

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "name": "string",
  "slug": "string",
  "description": "string|null",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### Audit Log Entry

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "projectId": "uuid|null",
  "actorUserId": "uuid",
  "action": "string",
  "targetType": "organization|project",
  "targetId": "uuid",
  "metadata": { "any": "json" },
  "createdAt": "ISO-8601"
}
```

## Auth Endpoints

### POST `/auth/signup`

Create user + create session.

Request:

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "supersecret123"
}
```

Response `201`:

```json
{
  "session_token": "raw_token",
  "token_type": "Bearer",
  "user": {
    "id": "uuid",
    "username": "alice",
    "email": "alice@example.com",
    "createdAt": "2026-05-31T12:00:00.000Z"
  }
}
```

Conflicts:

- `409` username or email already taken

### POST `/auth/login`

Request:

```json
{
  "username": "alice",
  "password": "supersecret123"
}
```

Response `200`:

```json
{
  "session_token": "raw_token",
  "token_type": "Bearer"
}
```

Errors:

- `401` invalid credentials

### POST `/auth/logout`

Requires Bearer token.

Response `204` (no body)

Errors:

- `401` unauthorized
- `401` invalid session

## Me Endpoint

### GET `/me`

Requires Bearer token.

Response `200`:

```json
{
  "id": "uuid",
  "username": "alice",
  "email": "alice@example.com",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

## Organization Endpoints

Router prefix: `/orgs`

### GET `/orgs`

List organizations current user belongs to.

Response `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Acme Inc",
      "slug": "acme",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ]
}
```

### POST `/orgs`

Create organization and add creator as `owner`.

Request:

```json
{
  "name": "Acme Inc",
  "slug": "acme"
}
```

Response `201`:

```json
{
  "id": "uuid",
  "name": "Acme Inc",
  "slug": "acme",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

Errors:

- `409` organization slug already exists

### GET `/orgs/:org_id`

Response `200`: Organization

Errors:

- `404` organization not found (includes not-a-member)

### PATCH `/orgs/:org_id`

Owner only.

Request:

```json
{
  "name": "Acme Corporation",
  "slug": "acme-corp"
}
```

All fields optional.

Response `200`: Organization

Errors:

- `403` forbidden (non-owner)
- `404` organization not found
- `409` organization slug already exists

### GET `/orgs/:org_id/projects`

List projects within org.

Response `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "name": "Payments",
      "slug": "payments",
      "description": "Handles billing",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ]
}
```

Errors:

- `404` organization not found

### POST `/orgs/:org_id/projects`

Create project in org. Owner only.

Request:

```json
{
  "name": "Payments",
  "slug": "payments",
  "description": "Handles billing"
}
```

`description` is optional.

Response `201`: Project

Errors:

- `403` forbidden
- `404` organization not found
- `409` project slug already exists in organization

### GET `/orgs/:org_id/audit-logs?limit=50`

Organization-wide audit log (includes org and project events in that org).

- `limit` optional, default `50`, max `200`

Response `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "projectId": null,
      "actorUserId": "uuid",
      "action": "organization.created",
      "targetType": "organization",
      "targetId": "uuid",
      "metadata": {
        "name": "Acme Inc",
        "slug": "acme"
      },
      "createdAt": "ISO-8601"
    }
  ]
}
```

Errors:

- `404` organization not found

## Project Endpoints

Router prefix: `/projects`

### GET `/projects/:project_id`

Response `200`: Project

Errors:

- `404` project not found (includes not-a-member)

### PATCH `/projects/:project_id`

Owner only.

Request:

```json
{
  "name": "Payments API",
  "slug": "payments-api",
  "description": null
}
```

All fields optional.

Response `200`: Project

Errors:

- `403` forbidden
- `404` project not found
- `409` project slug already exists in organization

### DELETE `/projects/:project_id`

Owner only.

Response `204` (no body)

Errors:

- `403` forbidden
- `404` project not found

### GET `/projects/:project_id/audit-logs?limit=50`

Project-only audit log entries.

- `limit` optional, default `50`, max `200`

Response `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "projectId": "uuid",
      "actorUserId": "uuid",
      "action": "project.updated",
      "targetType": "project",
      "targetId": "uuid",
      "metadata": {
        "name": "Payments API",
        "slug": "payments-api"
      },
      "createdAt": "ISO-8601"
    }
  ]
}
```

Errors:

- `404` project not found

## Current Audit Actions Emitted

- `organization.created`
- `organization.updated`
- `project.created`
- `project.updated`
- `project.deleted`

## Authorization Rules

- All endpoints except `/ping` require a valid session token.
- User must belong to org to view org/project in that org.
- Org `owner` required for org updates and all project mutating operations.
- Non-membership is intentionally returned as `404` for org/project context endpoints.

## Claude Integration Notes

Recommended system prompt guidance for Claude tooling:

- Always send `Authorization: Bearer <token>` after login/signup.
- Treat `404` on org/project fetch as either missing resource or missing membership.
- On conflict (`409`), prompt user to choose a different slug.
- Use `GET /orgs/:org_id/audit-logs` for timeline views and `GET /projects/:project_id/audit-logs` for project-focused activity.
