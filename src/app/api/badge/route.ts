import { CompactedMonitorStateWrapper, getFromStore } from '@/server/store'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export const dynamic = 'force-dynamic'

type BadgePayload = {
  schemaVersion: 1
  label: string
  message: string
  color: string
  isError?: boolean
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
}

function errorBadge(label: string, message: string): BadgePayload {
  return {
    schemaVersion: 1,
    label,
    message,
    color: 'lightgrey',
    isError: true,
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)

    const monitorId = url.searchParams.get('id')
    const label = url.searchParams.get('label') ?? monitorId ?? 'UptimeFlare'

    const upMsg = url.searchParams.get('up') ?? 'UP'
    const downMsg = url.searchParams.get('down') ?? 'DOWN'
    const colorUp = url.searchParams.get('colorUp') ?? 'brightgreen'
    const colorDown = url.searchParams.get('colorDown') ?? 'red'

    if (!monitorId) {
      return new Response(JSON.stringify(errorBadge(label, 'no-monitor')), {
        headers: jsonHeaders,
        status: 400,
      })
    }

    const compactedState = new CompactedMonitorStateWrapper(
      await getFromStore(getCloudflareContext().env as any, 'state')
    )

    const lastIncident = compactedState.getIncident(
      monitorId,
      compactedState.incidentLen(monitorId) - 1
    )
    const isUp = lastIncident?.end !== null

    const badge: BadgePayload = {
      schemaVersion: 1,
      label,
      message: isUp ? upMsg : downMsg,
      color: isUp ? colorUp : colorDown,
    }

    return new Response(JSON.stringify(badge), {
      headers: jsonHeaders,
    })
  } catch (err) {
    console.error('Error rendering badge API:', err)
    return new Response(JSON.stringify(errorBadge('status', 'error')), {
      headers: jsonHeaders,
      status: 500,
    })
  }
}
