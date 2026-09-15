import { getRequestContext } from '@cloudflare/next-on-pages'
import { allMaintenances } from '@/server/maintenance'
import { maintenances } from '@/uptime.config'

export const runtime = 'edge'

export default async function handler(req: Request) {
  if (req.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } })
  try {
    const events = await allMaintenances(getRequestContext().env.UPTIMEFLARE_D1, maintenances)
    return new Response(JSON.stringify({ maintenances: events }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Unable to load maintenance events.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }
}
