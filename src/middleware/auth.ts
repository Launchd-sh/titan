import Elysia from 'elysia'
import { db } from '../db'
import { hashToken } from '../lib/tokens'

// Looks up the session token in the database on every request.
// Routes that .use(authMiddleware) are guaranteed a non-null session at runtime;
// use session! in handlers since TypeScript cannot narrow past onBeforeHandle.
export const authMiddleware = new Elysia({ name: 'auth' })
  .derive({ as: 'scoped' }, async ({ headers }) => {
    const authorization = headers['authorization'] ?? ''
    if (!authorization.startsWith('Bearer ')) return { session: null }

    const session = await db.session.findUnique({
      where: { tokenHash: hashToken(authorization.slice(7)) },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })
    return { session }
  })
  .onBeforeHandle({ as: 'scoped' }, ({ session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'unauthorized' }
    }
  })
