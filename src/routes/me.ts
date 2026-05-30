import Elysia from 'elysia'
import { authMiddleware } from '../middleware/auth'

export const meRoute = new Elysia()
  .use(authMiddleware)
  .get('/me', ({ session }) => session!.user)
