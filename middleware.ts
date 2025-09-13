import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { workerConfig } from './uptime.config'

export async function middleware(request: NextRequest) {
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
