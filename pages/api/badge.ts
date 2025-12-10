import { workerConfig } from '@/uptime.config'
import { MonitorState } from '@/types/config'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

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

export default async function handler(req: NextRequest): Promise<Response> {
  try {
    const url = new URL(req.url)

    const defaultMonitorId = workerConfig.monitors[0]?.id
    const monitorId = url.searchParams.get('id') ?? defaultMonitorId
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

    const { UPTIMEFLARE_STATE } = process.env as unknown as {
      UPTIMEFLARE_STATE: KVNamespace
    }

    const stateStr = await UPTIMEFLARE_STATE?.get('state')
    if (!stateStr) {
      return new Response(JSON.stringify(errorBadge(label, 'unavailable')), {
        headers: jsonHeaders,
        status: 503,
      })
    }

    const state = JSON.parse(stateStr) as MonitorState
    const monitorIncidentHistory = state.incident?.[monitorId]
    const hasLatencyData = Boolean(state.latency?.[monitorId]?.recent?.length)

    if (!monitorIncidentHistory || monitorIncidentHistory.length === 0 || !hasLatencyData) {
      return new Response(JSON.stringify(errorBadge(label, 'unknown')), {
        headers: jsonHeaders,
        status: 404,
      })
    }

    const latestIncident = monitorIncidentHistory.slice(-1)[0]
    const isUp = latestIncident.end !== undefined

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
