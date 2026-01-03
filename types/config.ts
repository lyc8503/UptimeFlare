import type { Env } from '../worker/src'

export type PageConfig = {
  title?: string
  links?: PageConfigLink[]
  group?: PageConfigGroup
  favicon?: string
  logo?: string
  maintenances?: {
    upcomingColor?: string
  }
  customFooter?: string
}

export type MaintenanceConfig = {
  monitors?: string[]
  title?: string
  body: string
  start: number | string
  end?: number | string
  color?: string
}

export type PageConfigGroup = { [key: string]: string[] }

export type PageConfigLink = {
  link: string
  label: string
  highlight?: boolean
}

export type MonitorTarget = {
  id: string
  name: string
  method: string
  target: string
  tooltip?: string
  statusPageLink?: string
  hideLatencyChart?: boolean
  expectedCodes?: number[]
  timeout?: number
  headers?: { [key: string]: string | number }
  body?: string
  responseKeyword?: string
  responseForbiddenKeyword?: string
  checkProxy?: string
  checkProxyFallback?: boolean
}

export type WorkerConfig<TEnv = Env> = {
  kvWriteCooldownMinutes?: number
  passwordProtection?: string
  monitors: MonitorTarget[]
  notification?: Notification
  callbacks?: Callbacks<TEnv>
}

export type Notification = {
  webhook?: WebhookConfig
  timeZone?: string
  gracePeriod?: number
  skipNotificationIds?: string[]
  skipErrorChangeNotification?: boolean
}

type SingleWebhook = {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  headers?: { [key: string]: string | number }
  payloadType: 'param' | 'json' | 'x-www-form-urlencoded'
  payload: any
  timeout?: number
}

export type WebhookConfig = SingleWebhook | SingleWebhook[]

export type Callbacks<TEnv = Env> = {
  onStatusChange?: (
    env: TEnv,
    monitor: MonitorTarget,
    isUp: boolean,
    timeIncidentStart: number,
    timeNow: number,
    reason: string
  ) => Promise<any> | any
  onIncident?: (
    env: TEnv,
    monitor: MonitorTarget,
    timeIncidentStart: number,
    timeNow: number,
    reason: string
  ) => Promise<any> | any
}

export type IncidentRecord = {
  start: number[]
  end: number | null // null if it's still open
  error: string[]
}

export type LatencyRecord = {
  loc: string
  ping: number
  time: number
}

export type MonitorState = {
  lastUpdate: number
  overallUp: number
  overallDown: number
  incident: Record<string, IncidentRecord[]>
  latency: Record<string, LatencyRecord[]> // recent 12 hour data, N min interval
}

// This is now the actual stored format (after 2026/01/01 D1 migration) to improve (de)serialization performance
// This gives a ~3.5x speedup in computing and a 40-60% reduction in size
// The CPULimitExceeded issue with 10+ monitors on free tier should be mitigated by this change
// local profiling result (1 op = parse + stringify):
// MonitorState (original): 277 ops/s, ±0.51%   | slowest, 71.09% slower
// MonitorStateCompacted:   958 ops/s, ±1.17%   | fastest
// Real world test with 8 monitors and a few hundred incidents and full latency data (status.lyc8503.net):
// original: 433KB size, 11.24ms P50 cpu time, 18.11ms P99 cpu time
// compacted: 181KB size (59% smaller), 6.36ms P50 cpu time (43% faster), 8.86ms P99 cpu time (51% faster)
export type MonitorStateCompacted = {
  lastUpdate: number
  overallUp: number
  overallDown: number

  // incident in stored in columnar format
  incident: Record<
    string, // monitor id
    {
      start: number[][]
      end: (number | null)[]
      error: string[][]
    }
  >

  // latency in stored in columnar format
  // also uses Run-length encoding for loc & Base64 encoding for number arrays
  latency: Record<
    string, // monitor id
    {
      loc: {
        v: string[] // RLE values
        c: number[] // RLE counts
      }
      // Hex results in a larger size and slower encoding/decoding than base64,
      // but we can pop/append arbitrary number of bytes without decoding then re-encoding the whole string
      // This is useful in Workers and shows a ~2% speedup comapred to base64, and it also simplifies the code
      ping: string // Hex encoded Uint16Array
      time: string // Hex encoded Uint32Array
    }
  >
}
