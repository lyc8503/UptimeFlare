import { createRemoteJWKSet } from 'jose/jwks/remote'
import { jwtVerify } from 'jose/jwt/verify'
import { AdminInputError } from './maintenance'
import adminConfig from '../deploy/admin.json'
import { getAdminOrigin } from '../util/admin-config'

export function adminResponse(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  })
}

export function adminError(error: unknown) {
  if (error instanceof AdminInputError) return adminResponse({ error: error.message }, error.status)
  console.error('Admin request failed', error instanceof Error ? error.message : 'Unknown error')
  return adminResponse({ error: 'Unable to save or load events. Please try again.' }, 500)
}

export async function readAdminInput(req: Request): Promise<Record<string, unknown>> {
  if (req.headers.get('origin') !== new URL(req.url).origin) {
    throw new AdminInputError('This request must come from the admin dashboard.', 403)
  }
  if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new AdminInputError('Send a JSON request.', 415)
  }
  // Limit the body while reading, including requests without Content-Length.
  const reader = req.body?.getReader()
  if (!reader) throw new AdminInputError('A request body is required.')
  let size = 0
  let text = ''
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 16_384) {
        await reader.cancel()
        throw new AdminInputError('The request is too large.', 413)
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } finally {
    reader.releaseLock()
  }
  try {
    const data: unknown = JSON.parse(text)
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error()
    return data as Record<string, unknown>
  } catch {
    throw new AdminInputError('Send a valid JSON object.')
  }
}

export type AccessEnvironment = {
  CF_ACCESS_TEAM_DOMAIN?: string
  CF_ACCESS_AUD?: string
}

// Only public signing keys are cached; identities and tokens stay request-local.
let signingKeys: { issuer: string; resolve: ReturnType<typeof createRemoteJWKSet> } | undefined

export async function requireAdmin(req: Request, env: AccessEnvironment) {
  if (!adminConfig.enabled) throw new AdminInputError('Not found.', 404)
  if (!getAdminOrigin()) throw new AdminInputError('Configure a valid HTTPS admin origin.', 503)
  const domain = env.CF_ACCESS_TEAM_DOMAIN
  const audience = env.CF_ACCESS_AUD
  if (!domain || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain) || !audience) {
    throw new AdminInputError('Cloudflare Access is not configured for this dashboard.', 503)
  }

  const token = req.headers.get('cf-access-jwt-assertion')
  if (!token || token.length > 16_384) {
    throw new AdminInputError('Sign in with Cloudflare Access to continue.', 401)
  }

  const issuer = `https://${domain}`
  if (signingKeys?.issuer !== issuer) {
    signingKeys = {
      issuer,
      resolve: createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`), {
        timeoutDuration: 5000,
        cacheMaxAge: 5 * 60_000,
        cooldownDuration: 30_000,
      }),
    }
  }

  try {
    const { payload } = await jwtVerify(token, signingKeys.resolve, {
      issuer,
      audience,
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'sub', 'email', 'type'],
    })
    if (
      payload.type !== 'app' ||
      typeof payload.email !== 'string' ||
      !payload.email ||
      !payload.sub
    ) {
      throw new Error('A signed-in Access user is required.')
    }
    return { email: payload.email, subject: payload.sub }
  } catch {
    throw new AdminInputError(
      'Your Cloudflare Access session is invalid or expired. Sign in again.',
      401
    )
  }
}
