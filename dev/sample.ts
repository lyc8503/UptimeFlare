// Sample data for `npm run dev`, which has no D1 database. Never used in production.
//   /                    normal: 120 days of history with a few past incidents
//   /?sample=outage      one service down now, plus an incident notice
//   /?sample=maintenance maintenance in progress and one planned
//   /?sample=empty       before the first check
import type { MaintenanceConfig, MonitorStateCompacted, MonitorTarget } from '@/types/config'

const hex = (arr: Uint16Array | Uint32Array) =>
  Array.from(new Uint8Array(arr.buffer), (b) => b.toString(16).padStart(2, '0')).join('')

// Deterministic noise so the preview looks the same on every reload.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

export function sampleState(monitors: MonitorTarget[], scenario = ''): string | null {
  if (scenario === 'empty') return null
  const now = Math.round(Date.now() / 1000)
  const day = 86400
  const data: MonitorStateCompacted = { lastUpdate: now - 23, overallUp: 0, overallDown: 0, incident: {}, latency: {} }

  // past incidents: [monitor index, days ago, minutes, error]
  const past: [number, number, number, string][] = [
    [0, 63, 4, 'HTTP 522 from Cloudflare'],
    [1, 40, 7, 'Timed out after 10 seconds'],
    [1, 12, 18, 'HTTP 503: Service Unavailable'],
    [2, 12, 18, 'HTTP 503: Service Unavailable'],
    [2, 3, 2, 'Timed out after 10 seconds'],
  ]

  monitors.forEach((m, idx) => {
    const start: number[][] = [[now - 120 * day]]
    const end: (number | null)[] = [now - 120 * day]
    const error: string[][] = [['dummy']]
    for (const [i, ago, mins, err] of past) {
      if (i !== idx) continue
      const s = now - ago * day + 3600 * 14
      start.push([s])
      end.push(s + mins * 60)
      error.push([err])
    }
    const down = scenario === 'outage' && idx === monitors.length - 1
    if (down) {
      start.push([now - 11 * 60, now - 4 * 60])
      end.push(null)
      error.push(['HTTP 502: Bad Gateway', 'Timed out after 10 seconds'])
    }
    down ? data.overallDown++ : data.overallUp++
    data.incident[m.id] = { start, end, error }

    // latency every 5 minutes for 12 hours
    const r = rng(idx + 7)
    const times: number[] = []
    const pings: number[] = []
    for (let t = now - 12 * 3600; t <= now; t += 300) {
      times.push(t)
      pings.push(Math.round(90 + idx * 35 + r() * 40 + (r() > 0.96 ? 180 : 0)))
    }
    data.latency[m.id] = {
      time: hex(new Uint32Array(times)),
      ping: hex(new Uint16Array(pings)),
      loc: { v: ['IAD'], c: [times.length] },
    }
  })
  return JSON.stringify(data)
}

export function sampleNotices(scenario = ''): MaintenanceConfig[] {
  const at = (days: number, hour = 14) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(hour, 0, 0, 0)
    return d.toISOString()
  }
  const notices: MaintenanceConfig[] = [
    {
      title: 'Apps in US East were slow for 18 minutes',
      body: 'A storage update on one server made some apps slow to respond. We rolled it back and every app recovered without data loss.',
      monitors: ['dashboard', 'apps-us-east'],
      start: at(-12),
      end: at(-12, 15),
      color: 'green',
    },
  ]
  if (scenario === 'outage') {
    notices.push({
      title: 'Some apps in US East aren’t loading',
      body: 'We’re looking into it now. Your data is safe. Next update within 30 minutes.',
      monitors: ['apps-us-east'],
      start: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      color: 'red',
    })
  }
  if (scenario === 'maintenance') {
    notices.push(
      {
        title: 'Dashboard maintenance',
        body: 'We’re moving the dashboard to a new database server. Your apps keep running; you can’t sign in for about 20 minutes.',
        monitors: ['dashboard'],
        start: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        color: 'blue',
      },
      {
        title: 'Server updates in US East',
        body: 'Each app restarts once, for under a minute, during this window.',
        monitors: ['apps-us-east'],
        start: at(4, 6),
        end: at(4, 7),
        color: 'blue',
      }
    )
  }
  return notices
}
