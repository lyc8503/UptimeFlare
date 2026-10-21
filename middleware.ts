import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { workerConfig } from './uptime.config'
import adminConfig from './deploy/admin.json'
import { getAdminOrigin } from './util/admin-config'

export async function middleware(request: NextRequest) {
  // Alternate Pages domains must enter through the Access-protected hostname.
  if (
    request.nextUrl.pathname === '/admin' ||
    request.nextUrl.pathname === '/admin/' ||
    request.nextUrl.pathname === '/admin.html'
  ) {
    if (!adminConfig.enabled) return new NextResponse('Not found.', { status: 404 })
    const origin = getAdminOrigin()
    if (!origin) return new NextResponse('Admin origin is not configured.', { status: 503 })
    if (request.nextUrl.origin !== origin || request.nextUrl.pathname !== '/admin') {
      return NextResponse.redirect(new URL('/admin', origin))
    }
  }
  const passwordProtection = workerConfig.passwordProtection
  if (passwordProtection) {
    const authHeader = request.headers.get('Authorization')
    let authenticated = false
    const expected = 'Basic ' + btoa(passwordProtection)

    if (authHeader && authHeader.length === expected.length) {
      // a simple timing-safe compare
      authenticated = true
      for (let i = 0; i < authHeader.length; i++) {
        if (authHeader[i] !== expected[i]) authenticated = false
      }
    }

    if (!authenticated) {
      return NextResponse.json(
        { code: 401, message: 'Not authenticated' },
        { status: 401, headers: { 'WWW-Authenticate': 'Basic' } }
      )
    }
  }
}
