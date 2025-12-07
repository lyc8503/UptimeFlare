import { NextRequest } from 'next/server'

export const runtime = 'edge'

type DataResponse = {
  up: number
  down: number
  updatedAt: number
  monitors: Record<
    string,
    {
      up: boolean
      latency: number
      location: string
      message: string
    }
  >
}

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

    const monitorId = url.searchParams.get('id')
    if (!monitorId) {
      return new Response(JSON.stringify(errorBadge('UptimeFlare', 'id required')), {
        headers: jsonHeaders,
        status: 400,
      })
    }
    const label = url.searchParams.get('label') ?? 'UptimeFlare'

    const upMsg = url.searchParams.get('up') ?? 'UP'
    const downMsg = url.searchParams.get('down') ?? 'DOWN'
    const colorUp = url.searchParams.get('colorUp') ?? 'brightgreen'
    const colorDown = url.searchParams.get('colorDown') ?? 'red'

    const dataUrl = new URL('/api/data', url.origin)
    const resp = await fetch(dataUrl, { cache: 'no-store' })

    if (!resp.ok) {
      return new Response(JSON.stringify(errorBadge(label, 'unavailable')), {
        headers: jsonHeaders,
        status: resp.status,
      })
    }

    const payload = (await resp.json()) as DataResponse
    const monitor = payload.monitors?.[monitorId]

    if (!monitor) {
      return new Response(JSON.stringify(errorBadge(label, 'unknown')), {
        headers: jsonHeaders,
        status: 404,
      })
    }

    const isUp = monitor.up
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
