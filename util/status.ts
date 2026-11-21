// Status maths shared by the page components. The worker's state format is unchanged from
// upstream UptimeFlare; everything here only reads it.
import { MaintenanceConfig, MonitorState, MonitorTarget } from '@/types/config'

export type Tone = 'success' | 'warning' | 'danger' | 'neutral'

export const DAYS = 90

const overlap = (a1: number, a2: number, b1: number, b2: number) =>
  Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))

export function isDown(state: MonitorState, id: string): boolean {
  const list = state.incident[id]
  return !!list && list.length > 0 && list[list.length - 1].end === null
}

export function activeNotices(maintenances: MaintenanceConfig[], now = new Date()) {
  return maintenances.filter((m) => now >= new Date(m.start) && (!m.end || now <= new Date(m.end)))
}

export function upcomingNotices(maintenances: MaintenanceConfig[], now = new Date()) {
  return maintenances
    .filter((m) => now < new Date(m.start))
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
}

export type MonitorStatus = 'operational' | 'degraded' | 'maintenance' | 'outage' | 'unknown'

// What an active notice says about a service: red = outage, yellow = degraded,
// blue = maintenance, green = resolved (no effect).
function noticeStatus(color?: string): MonitorStatus | null {
  switch (noticeTone(color)) {
    case 'danger':
      return 'outage'
    case 'info':
      return 'maintenance'
    case 'success':
      return null
    default:
      return 'degraded'
  }
}

const rank: MonitorStatus[] = ['unknown', 'operational', 'maintenance', 'degraded', 'outage']

export function monitorStatus(
  state: MonitorState,
  maintenances: MaintenanceConfig[],
  id: string
): MonitorStatus {
  if (!state.incident[id]) return 'unknown'
  let status: MonitorStatus = isDown(state, id) ? 'outage' : 'operational'
  for (const n of activeNotices(maintenances)) {
    if (!n.monitors?.includes(id)) continue
    const s = noticeStatus(n.color)
    if (s && rank.indexOf(s) > rank.indexOf(status)) status = s
  }
  return status
}

// Uptime since monitoring began (the worker keeps 90 days of incidents).
export function uptimePercent(state: MonitorState, id: string): number | null {
  const list = state.incident[id]
  if (!list || list.length === 0) return null
  const now = Date.now() / 1000
  const total = now - list[0].start[0]
  if (total <= 0) return null
  let down = 0
  for (const inc of list) down += (inc.end ?? now) - inc.start[0]
  return ((total - down) / total) * 100
}

export type Day = {
  start: number // unix seconds, local midnight
  percent: number | null // null: not monitored that day
  downSeconds: number
  events: { from: number; to: number; error: string }[]
}

export function dailyHistory(state: MonitorState, id: string): Day[] {
  const list = state.incident[id]
  const now = Math.round(Date.now() / 1000)
  const monitorStart = list?.[0]?.start[0] ?? now
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  const today = Math.round(midnight.getTime() / 1000)
  const days: Day[] = []

  for (let i = DAYS - 1; i >= 0; i--) {
    // step by calendar day so daylight-saving changes don't shift the bars
    const d = new Date(midnight)
    d.setDate(d.getDate() - i)
    const start = i === 0 ? today : Math.round(d.getTime() / 1000)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const end = Math.round(next.getTime() / 1000)

    const watched = overlap(start, end, monitorStart, now)
    let downSeconds = 0
    const events: Day['events'] = []
    for (const inc of list ?? []) {
      if (inc.error[0] === 'dummy') continue // the worker's marker for when monitoring began
      const incEnd = inc.end ?? now
      const o = overlap(start, end, inc.start[0], incEnd)
      if (o <= 0) continue
      downSeconds += o
      inc.error.forEach((error, k) => {
        const from = Math.max(inc.start[k], start)
        const to = Math.min(k === inc.error.length - 1 ? incEnd : inc.start[k + 1], end)
        if (to > from) events.push({ from, to, error })
      })
    }
    days.push({
      start,
      percent: watched > 0 ? ((watched - downSeconds) / watched) * 100 : null,
      downSeconds,
      events,
    })
  }
  return days
}

// Colour by how long a service was down that day: any downtime is worth a look, half an hour
// or more is serious. Every bar also has a text label (UptimeBars), so colour is never alone.
export function dayTone(day: Pick<Day, 'percent' | 'downSeconds'>): Tone {
  if (day.percent === null) return 'neutral'
  if (day.downSeconds === 0) return 'success'
  if (day.downSeconds < 30 * 60) return 'warning'
  return 'danger'
}

export function formatPercent(p: number | null): string {
  if (p === null) return 'No data'
  if (p >= 100) return '100%'
  return `${(Math.floor(p * 100) / 100).toFixed(2)}%`
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s} second${s === 1 ? '' : 's'}`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return `${h} hour${h === 1 ? '' : 's'}${rest ? ` ${rest} min` : ''}`
}

export function formatDate(unix: number, withYear = false): string {
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

export function formatTime(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(value: number | string): string {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function overallSummary(
  state: MonitorState,
  monitors: MonitorTarget[],
  maintenances: MaintenanceConfig[]
): { title: string; tone: Tone } {
  if (state.lastUpdate === 0) return { title: 'Waiting for the first checks', tone: 'neutral' }
  const statuses = monitors.map((m) => monitorStatus(state, maintenances, m.id))
  const count = (s: MonitorStatus) => statuses.filter((x) => x === s).length
  const down = count('outage')
  if (down === monitors.length) return { title: 'Cottage is down', tone: 'danger' }
  if (down > 0)
    return {
      title: `${down} of ${monitors.length} services ${down === 1 ? 'is' : 'are'} down`,
      tone: 'danger',
    }
  if (count('degraded') > 0) return { title: 'Some services are running slowly', tone: 'warning' }
  if (count('maintenance') > 0) return { title: 'Maintenance in progress', tone: 'warning' }
  return { title: 'All systems normal', tone: 'success' }
}

// Notice colours in uptime.config.ts map to banner tones.
export function noticeTone(color?: string): Tone | 'info' {
  switch (color) {
    case 'red':
    case 'danger':
      return 'danger'
    case 'green':
    case 'success':
      return 'success'
    case 'blue':
    case 'info':
      return 'info'
    default:
      return 'warning'
  }
}
