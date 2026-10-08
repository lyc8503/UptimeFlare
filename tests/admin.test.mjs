import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import { SignJWT, exportJWK, generateKeyPair } from 'jose'

// Use Wrangler's bundled compiler and runtime so tests exercise the deployed D1 API.
const require = createRequire(import.meta.url)
const wranglerRequire = createRequire(require.resolve('wrangler/package.json'))
const { build } = wranglerRequire('esbuild')
const { Miniflare } = wranglerRequire('miniflare')
const issuer = 'https://admin-test.cloudflareaccess.com'
const audience = randomBytes(32).toString('hex')
let privateKey
let publicJwk
let mf
let options
let db
let accessToken
let notifications = 0

before(async () => {
  const keys = await generateKeyPair('RS256', { extractable: true })
  privateKey = keys.privateKey
  publicJwk = { ...(await exportJWK(keys.publicKey)), alg: 'RS256', use: 'sig', kid: 'test-key' }
  const bundle = await build({
    stdin: {
      contents: `
        import events from './pages/api/admin/events.ts'
        import { middleware } from './middleware.ts'
        import session from './pages/api/admin/session.ts'
        import maintenances from './pages/api/maintenances.ts'
        import data from './pages/api/data.ts'
        import { requestContext } from '@cloudflare/next-on-pages'
        import { allMaintenances } from './server/maintenance.ts'
        import { formatAndNotify } from './worker/src/util.ts'
        import adminConfig from './deploy/admin.json'
        import { workerConfig, maintenances as configured } from './uptime.config.ts'
        workerConfig.monitors = [
          { id: 'api-service', name: 'API Service', method: 'GET', target: 'https://api.example.test', headers: { Authorization: 'Bearer fixture-secret' } },
          { id: 'web-service', name: 'Web Service', method: 'GET', target: 'https://web.example.test' },
        ]
        configured.splice(0, configured.length, { title: 'Fixture configured maintenance', body: 'Historical notice', monitors: ['api-service'], start: 0, end: 1 })
        workerConfig.notification = { webhook: { url: 'https://notification.test/', payloadType: 'json', payload: { text: '$MSG' } } }
        export default {
          async fetch(req, env) {
            adminConfig.enabled = env.TEST_ADMIN_ENABLED !== 'false'
            adminConfig.adminOrigin = env.TEST_ADMIN_ORIGIN ?? 'https://status.test'
            configured[0].start = env.TEST_CONFIGURED_ACTIVE ? Date.now() - 1000 : 0
            configured[0].end = env.TEST_CONFIGURED_ACTIVE ? Date.now() + 3600000 : 1
            configured[0].monitors = env.TEST_CONFIGURED_ACTIVE === 'all' ? [] : ['api-service']
            return requestContext.run({ env }, async () => {
              const path = new URL(req.url).pathname
              if (['/admin', '/admin/', '/admin.html'].includes(path)) {
                return await middleware({ nextUrl: new URL(req.url), headers: req.headers }) ?? new Response('Admin page')
              }
              if (path === '/api/admin/events') return events(req)
              if (path === '/api/admin/session') return session(req)
              if (path === '/api/maintenances') return maintenances(req)
              if (path === '/api/data') return data(req)
              if (path === '/test/notify') {
                const monitor = workerConfig.monitors.find(m => m.id === new URL(req.url).searchParams.get('monitor'))
                const now = Math.floor(Date.now() / 1000)
                await formatAndNotify(monitor, false, now, now, 'Down', await allMaintenances(env.UPTIMEFLARE_D1, configured))
                return new Response('OK')
              }
              return new Response('Not found', { status: 404 })
            })
          }
        }
      `,
      resolveDir: process.cwd(),
      sourcefile: 'admin-test-worker.ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2022',
    platform: 'neutral',
    mainFields: ['browser', 'module', 'main'],
    // Match Next's Edge response implementation without its Node-only barrel exports.
    alias: {
      'next/server': require.resolve('next/dist/esm/server/web/spec-extension/response.js'),
    },
    external: ['node:async_hooks'],
    plugins: [
      {
        name: 'test-request-context',
        setup(build) {
          build.onResolve({ filter: /^@cloudflare\/next-on-pages$/ }, () => ({
            path: 'context',
            namespace: 'test',
          }))
          build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
            contents: `import { AsyncLocalStorage } from 'node:async_hooks'; export const requestContext = new AsyncLocalStorage(); export const getRequestContext = () => requestContext.getStore();`,
            loader: 'js',
          }))
        },
      },
    ],
  })
  options = {
    modules: true,
    script: bundle.outputFiles[0].text,
    compatibilityDate: '2025-04-02',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['UPTIMEFLARE_D1'],
    bindings: { CF_ACCESS_TEAM_DOMAIN: 'admin-test.cloudflareaccess.com', CF_ACCESS_AUD: audience },
    outboundService: (request) => {
      if (request.url === `${issuer}/cdn-cgi/access/certs`) {
        return Response.json({ keys: [publicJwk] })
      }
      assert.equal(new URL(request.url).hostname, 'notification.test')
      notifications++
      return new Response('OK')
    },
  }
  mf = new Miniflare(options)
  db = await mf.getD1Database('UPTIMEFLARE_D1')
  // The same idempotent SQL runs on every production deployment.
  const sql = await readFile(new URL('../init.sql', import.meta.url), 'utf8')
  for (let i = 0; i < 2; i++) {
    for (const statement of sql.split(';').filter((value) => value.trim()))
      await db.prepare(statement).run()
  }
})

after(async () => {
  await mf?.dispose()
})

function request(
  path,
  { method = 'GET', body, auth = true, origin = 'https://status.test', headers = {} } = {}
) {
  return mf.dispatchFetch(`https://status.test${path}`, {
    method,
    redirect: 'manual',
    headers: {
      ...(auth && accessToken ? { 'Cf-Access-Jwt-Assertion': accessToken } : {}),
      Origin: origin,
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  })
}

async function token(claims = {}, key = privateKey) {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({
    iss: issuer,
    aud: [audience],
    sub: 'access-user',
    email: 'admin@example.test',
    type: 'app',
    iat: now,
    exp: now + 3600,
    ...claims,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .sign(key)
}

beforeEach(async () => {
  for (const table of ['maintenance_events', 'uptimeflare'])
    await db.prepare(`DELETE FROM ${table}`).run()
  notifications = 0
  accessToken = await token()
})

test('admin reads and all mutations require Access; public notices remain readable', async () => {
  for (const method of ['GET', 'POST', 'PATCH']) {
    const response = await request('/api/admin/events', {
      method,
      auth: false,
      ...(method === 'GET' ? {} : { body: {} }),
    })
    assert.equal(response.status, 401)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
  assert.equal((await request('/api/maintenances', { auth: false })).status, 200)
  for (const headers of [
    { 'Cf-Access-Authenticated-User-Email': 'admin@example.test' },
    { Cookie: 'uptimeflare_admin=unsigned-session' },
    { 'Cf-Access-Jwt-Assertion': 'forged' },
    { Cookie: `CF_Authorization=${accessToken}` },
  ])
    assert.equal((await request('/api/admin/events', { auth: false, headers })).status, 401)
  const result = await (await request('/api/admin/events')).json()
  assert.ok(result.monitors.length > 0)
  assert.ok(result.monitors.every((monitor) => Object.keys(monitor).sort().join() === 'id,name'))
  assert.equal(result.user.email, 'admin@example.test')
  assert.ok(!JSON.stringify(result).includes(accessToken))
  assert.ok(!JSON.stringify(result).includes('fixture-secret'))
})

test('valid signed identity is accepted; wrong audience, issuer, expiry, and signature are rejected', async () => {
  const session = await request('/api/admin/session')
  assert.equal(session.status, 200)
  assert.equal((await session.json()).user.email, 'admin@example.test')
  assert.equal(session.headers.get('set-cookie'), null)
  for (const claims of [
    { aud: 'another-application' },
    { iss: 'https://another-team.cloudflareaccess.com' },
    { exp: Math.floor(Date.now() / 1000) - 60 },
    { nbf: Math.floor(Date.now() / 1000) + 3600 },
  ]) {
    assert.equal(
      (
        await request('/api/admin/events', {
          headers: { 'Cf-Access-Jwt-Assertion': await token(claims) },
        })
      ).status,
      401
    )
  }
  const otherKey = await generateKeyPair('RS256')
  assert.equal(
    (
      await request('/api/admin/events', {
        headers: { 'Cf-Access-Jwt-Assertion': await token({}, otherKey.privateKey) },
      })
    ).status,
    401
  )
})

test('non-identity tokens and incomplete or algorithm-confused assertions fail closed', async () => {
  for (const claims of [{ email: undefined }, { exp: undefined }, { sub: '' }, { type: 'org' }]) {
    assert.equal(
      (
        await request('/api/admin/events', {
          headers: { 'Cf-Access-Jwt-Assertion': await token(claims) },
        })
      ).status,
      401
    )
  }
  const forged = await new SignJWT({ iss: issuer, aud: audience, email: 'admin@example.test' })
    .setProtectedHeader({ alg: 'HS256', kid: 'test-key' })
    .sign(randomBytes(32))
  assert.equal(
    (await request('/api/admin/events', { headers: { 'Cf-Access-Jwt-Assertion': forged } })).status,
    401
  )
})

test('missing Access settings fail closed; Access handles sign-in and sign-out', async () => {
  for (const method of ['POST', 'DELETE']) {
    assert.equal((await request('/api/admin/session', { method, body: {} })).status, 405)
  }
  await mf.setOptions({ ...options, bindings: {} })
  assert.equal((await request('/api/admin/events')).status, 503)
  assert.equal((await request('/api/maintenances', { auth: false })).status, 200)
  await mf.setOptions(options)
  db = await mf.getD1Database('UPTIMEFLARE_D1')
})

test('mutations reject cross-origin, malformed, oversized, and non-JSON requests', async () => {
  for (const path of ['/api/admin/events']) {
    assert.equal(
      (await request(path, { method: 'POST', body: {}, origin: 'https://evil.test' })).status,
      403
    )
    assert.equal((await request(path, { method: 'POST', body: '{' })).status, 400)
    assert.equal((await request(path, { method: 'POST', body: '[]' })).status, 400)
    assert.equal(
      (await request(path, { method: 'POST', body: { padding: 'x'.repeat(17000) } })).status,
      413
    )
    assert.equal(
      (
        await request(path, {
          method: 'POST',
          body: '{}',
          headers: { 'Content-Type': 'text/plain' },
        })
      ).status,
      415
    )
  }
})

test('Quick action for a selected monitor persists, appears publicly, extends, ends, and prevents concurrent duplicates', async () => {
  const responses = await Promise.all(
    Array.from({ length: 3 }, () =>
      request('/api/admin/events', {
        method: 'POST',
        body: { preset: 'maintenance', monitorId: 'api-service', minutes: 30 },
      })
    )
  )
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409, 409])
  const { event } = await responses.find((response) => response.status === 201).json()
  assert.deepEqual(event.monitors, ['api-service'])
  assert.equal(event.end - event.start, 30 * 60_000)
  const publicEvents = await (await request('/api/maintenances', { auth: false })).json()
  assert.ok(publicEvents.maintenances.some((item) => item.id === event.id))
  const extended = await (
    await request('/api/admin/events', {
      method: 'PATCH',
      body: { id: event.id, action: 'extend', minutes: 30 },
    })
  ).json()
  assert.equal(extended.event.end, event.end + 30 * 60_000)
  const ended = await request('/api/admin/events', {
    method: 'PATCH',
    body: { id: event.id, action: 'end' },
  })
  assert.equal(ended.status, 200)
  const after = await (await request('/api/maintenances', { auth: false })).json()
  assert.ok(!after.maintenances.some((item) => item.id === event.id))
  assert.equal(
    (
      await request('/api/admin/events', {
        method: 'PATCH',
        body: { id: event.id, action: 'extend', minutes: 30 },
      })
    ).status,
    409
  )
  const history = await (await request('/api/admin/events')).json()
  assert.ok(history.events.some((item) => item.id === event.id))
})

test('custom events validate scope and dates; scheduled notices can be cancelled without deletion', async () => {
  const input = {
    title: 'Database upgrade',
    body: 'A short outage is expected.',
    monitors: ['api-service', 'web-service'],
    start: Date.now() + 3600_000,
    end: Date.now() + 7200_000,
    color: 'blue',
  }
  for (const invalid of [
    { title: '' },
    { body: '' },
    { monitors: [] },
    { monitors: ['unknown'] },
    { start: 'invalid' },
    { end: input.start - 1 },
    { color: 'made-up' },
  ]) {
    assert.equal(
      (await request('/api/admin/events', { method: 'POST', body: { ...input, ...invalid } }))
        .status,
      400
    )
  }
  const created = await request('/api/admin/events', { method: 'POST', body: input })
  assert.equal(created.status, 201)
  const { event } = await created.json()
  assert.equal(
    (await request('/api/admin/events', { method: 'PATCH', body: { id: event.id, action: 'end' } }))
      .status,
    409
  )
  assert.equal(
    (
      await request('/api/admin/events', {
        method: 'PATCH',
        body: { id: event.id, action: 'cancel' },
      })
    ).status,
    200
  )
  const publicEvents = await (await request('/api/maintenances')).json()
  assert.ok(!publicEvents.maintenances.some((item) => item.id === event.id))
  const history = await (await request('/api/admin/events')).json()
  assert.ok(history.events.find((item) => item.id === event.id).cancelledAt)
})

test('active maintenance suppresses only affected notifications and resumes after ending', async () => {
  const created = await request('/api/admin/events', {
    method: 'POST',
    body: { preset: 'maintenance', monitorId: 'api-service', minutes: 0 },
  })
  const { event } = await created.json()
  assert.equal(event.end, undefined)
  await request('/test/notify?monitor=api-service')
  assert.equal(notifications, 0)
  await request('/test/notify?monitor=web-service')
  assert.equal(notifications, 1)
  assert.equal(
    (
      await request('/api/admin/events', {
        method: 'PATCH',
        body: { id: event.id, action: 'extend', minutes: 30 },
      })
    ).status,
    409
  )
  await request('/api/admin/events', { method: 'PATCH', body: { id: event.id, action: 'end' } })
  await request('/test/notify?monitor=api-service')
  assert.equal(notifications, 2)
})

test('the public data API includes dynamic events and retains configured maintenance', async () => {
  const state = {
    lastUpdate: Math.floor(Date.now() / 1000),
    overallUp: 0,
    overallDown: 0,
    incident: {},
    latency: {},
  }
  const { monitors } = await (await request('/api/admin/events')).json()
  for (const { id } of monitors) {
    state.incident[id] = {
      start: [[state.lastUpdate]],
      end: [state.lastUpdate],
      error: [['dummy']],
    }
    state.latency[id] = { loc: { v: ['YYZ'], c: [1] }, ping: '0100', time: '00000000' }
  }
  await db
    .prepare('INSERT INTO uptimeflare (key, value) VALUES (?, ?)')
    .bind('state', JSON.stringify(state))
    .run()
  const { event } = await (
    await request('/api/admin/events', {
      method: 'POST',
      body: { preset: 'maintenance', monitorId: 'api-service', minutes: 15 },
    })
  ).json()
  const response = await request('/api/data', { auth: false })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.ok(body.maintenances.some((item) => item.id === event.id))
  assert.ok(body.maintenances.some((item) => item.title === 'Fixture configured maintenance'))
})

test('disabled dashboard rejects every admin operation and adds no D1 reads for maintenance', async () => {
  const config = JSON.parse(
    await readFile(new URL('../deploy/admin.json', import.meta.url), 'utf8')
  )
  assert.equal(config.enabled, false, 'The feature must ship disabled by default')
  // With no D1 binding, an accidental maintenance query would return 503.
  await mf.setOptions({
    ...options,
    d1Databases: [],
    bindings: { ...options.bindings, TEST_ADMIN_ENABLED: 'false' },
  })
  try {
    assert.equal((await request('/admin')).status, 404)
    for (const path of ['/api/admin/events', '/api/admin/session']) {
      for (const method of ['GET', 'POST', 'PATCH']) {
        assert.equal(
          (await request(path, { method, ...(method === 'GET' ? {} : { body: {} }) })).status,
          404
        )
      }
    }
    const response = await request('/api/maintenances', { auth: false })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).maintenances[0].title, 'Fixture configured maintenance')
  } finally {
    await mf.setOptions(options)
    db = await mf.getD1Database('UPTIMEFLARE_D1')
  }
})

test('invalid canonical origins fail closed even with a valid Access identity', async () => {
  try {
    for (const origin of [
      '',
      'http://status.test',
      'https://user@status.test',
      'https://status.test/another-path',
      'https://status.test/?next=evil',
    ]) {
      await mf.setOptions({
        ...options,
        bindings: { ...options.bindings, TEST_ADMIN_ORIGIN: origin },
      })
      assert.equal((await request('/api/admin/events')).status, 503)
    }
  } finally {
    await mf.setOptions(options)
    db = await mf.getD1Database('UPTIMEFLARE_D1')
  }
})

test('quick windows are monitor-specific and respect overlapping custom events', async () => {
  for (const monitorId of ['unknown', undefined, 42]) {
    assert.equal(
      (
        await request('/api/admin/events', {
          method: 'POST',
          body: { preset: 'maintenance', monitorId, minutes: 15 },
        })
      ).status,
      400
    )
  }
  for (const monitorId of ['api-service', 'web-service']) {
    const response = await request('/api/admin/events', {
      method: 'POST',
      body: { preset: 'maintenance', monitorId, minutes: 15 },
    })
    assert.equal(response.status, 201)
    const { event } = await response.json()
    assert.deepEqual(event.monitors, [monitorId])
    assert.match(event.title, /Service maintenance$/)
  }
  await db.prepare('DELETE FROM maintenance_events').run()
  const custom = await request('/api/admin/events', {
    method: 'POST',
    body: {
      title: 'Shared update',
      body: 'A short interruption is expected.',
      monitors: ['api-service', 'web-service'],
      start: 'now',
      end: null,
      color: 'blue',
    },
  })
  assert.equal(custom.status, 201)
  assert.equal(
    (
      await request('/api/admin/events', {
        method: 'POST',
        body: {
          preset: 'maintenance',
          monitorId: 'web-service',
          minutes: 30,
        },
      })
    ).status,
    409
  )
})

test('admin page redirects alternate hosts to the canonical protected origin', async () => {
  const response = await mf.dispatchFetch('https://preview.example.test/admin', {
    redirect: 'manual',
  })
  assert.equal(response.status, 307)
  assert.equal(response.headers.get('location'), 'https://status.test/admin')
  for (const path of ['/admin/', '/admin.html']) {
    const normalized = await request(path)
    assert.equal(normalized.status, 307)
    assert.equal(normalized.headers.get('location'), 'https://status.test/admin')
  }
  assert.equal((await request('/admin')).status, 200)
})

test('quick actions respect scoped and global configuration-defined maintenance', async () => {
  try {
    for (const scope of ['one', 'all']) {
      await mf.setOptions({
        ...options,
        bindings: { ...options.bindings, TEST_CONFIGURED_ACTIVE: scope },
      })
      for (const monitorId of ['api-service', 'web-service']) {
        const response = await request('/api/admin/events', {
          method: 'POST',
          body: {
            preset: 'maintenance',
            monitorId,
            minutes: 30,
          },
        })
        assert.equal(response.status, scope === 'all' || monitorId === 'api-service' ? 409 : 201)
      }
    }
  } finally {
    await mf.setOptions(options)
    db = await mf.getD1Database('UPTIMEFLARE_D1')
  }
})
