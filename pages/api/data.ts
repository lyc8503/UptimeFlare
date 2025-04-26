import { workerConfig } from '@/uptime.config'
import { MonitorState } from '@/types/config'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export default async function handler(req: NextRequest): Promise<Response> {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  const stateStr = await UPTIMEFLARE_STATE?.get('state')
  if (!stateStr) {
    return new Response(JSON.stringify({ error: 'No data available' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
  const state = JSON.parse(stateStr) as unknown as MonitorState

  let monitors: any = {}

  for (let monitor of workerConfig.monitors) {
    const isUp = state.incident[monitor.id].slice(-1)[0].end !== undefined
    monitors[monitor.id] = {
      up: isUp,
      latency: state.latency[monitor.id].recent.slice(-1)[0].ping,
      location: state.latency[monitor.id].recent.slice(-1)[0].loc,
      message: isUp ? 'OK' : state.incident[monitor.id].slice(-1)[0].error.slice(-1)[0],
    }
  }

  let ret = {
    up: state.overallUp,
    down: state.overallDown,
    updatedAt: state.lastUpdate,
    monitors: monitors,
  }

  return new Response(JSON.stringify(ret), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
