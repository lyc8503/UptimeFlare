import { getRequestContext } from '@cloudflare/next-on-pages'
import { adminError, adminResponse, readAdminInput, requireAdmin } from '@/server/admin'
import {
  createMaintenanceEvent,
  listMaintenanceEvents,
  updateMaintenanceEvent,
} from '@/server/maintenance'
import { maintenances, workerConfig } from '@/uptime.config'

export const runtime = 'edge'

export default async function handler(req: Request) {
  try {
    const env = getRequestContext().env
    const user = await requireAdmin(req, env)
    if (req.method === 'GET') {
      const events = await listMaintenanceEvents(env.UPTIMEFLARE_D1, true)
      const configured = maintenances.map((event, index) => ({
        ...event,
        id: `config-${index}`,
        title: event.title || 'Scheduled Maintenance',
        start: new Date(event.start).getTime(),
        ...(event.end === undefined ? {} : { end: new Date(event.end).getTime() }),
        source: 'config',
        createdAt: new Date(event.start).getTime(),
      }))
      return adminResponse({
        user,
        events: [...events, ...configured],
        monitors: workerConfig.monitors.map(({ id, name }) => ({ id, name })),
      })
    }
    if (req.method === 'POST') {
      const event = await createMaintenanceEvent(
        env.UPTIMEFLARE_D1,
        await readAdminInput(req),
        workerConfig.monitors,
        maintenances
      )
      return adminResponse({ event }, 201)
    }
    if (req.method === 'PATCH') {
      const event = await updateMaintenanceEvent(env.UPTIMEFLARE_D1, await readAdminInput(req))
      return adminResponse({ event })
    }
    return adminResponse({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST, PATCH' })
  } catch (error) {
    return adminError(error)
  }
}
