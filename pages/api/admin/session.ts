import { getRequestContext } from '@cloudflare/next-on-pages'
import { adminError, adminResponse, requireAdmin } from '@/server/admin'

export const runtime = 'edge'

export default async function handler(req: Request) {
  try {
    const user = await requireAdmin(req, getRequestContext().env)
    if (req.method !== 'GET') {
      return adminResponse(
        { error: 'Sign-in and sign-out are managed by Cloudflare Access.' },
        405,
        {
          Allow: 'GET',
        }
      )
    }
    return adminResponse({ authenticated: true, user })
  } catch (error) {
    return adminError(error)
  }
}
