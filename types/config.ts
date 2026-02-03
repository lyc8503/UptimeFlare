import type { Env } from '../worker/src'

export type PageConfig = {
  /** Title for your status page */
  title?: string
  /** Links shown at the header of your status page, could set `highlight` to `true` */
  links?: PageConfigLink[]
  /** Group your monitors; if specified, monitors will be grouped and ordered, not-listed monitors will be invisible (but still monitored) */
  group?: PageConfigGroup
  /** Path to your favicon, defaults to '/favicon.png' if not specified */
  favicon?: string
  /** Path to your logo, defaults to '/logo.svg' if not specified */
  logo?: string
  /** Maintenance related settings */
  maintenances?: {
    /** The color of upcoming maintenance alerts, default to 'gray'; active alerts use the color specified in the maintenance config */
    upcomingColor?: string
  }
  /** Custom footer html */
  customFooter?: string
}

/**
 * During maintenance, an alert will be shown at status page
 * Also, related downtime notifications will be skipped (if any)
 */
export type MaintenanceConfig = {
  /** Monitor IDs to be affected by this maintenance */
  monitors?: string[]
  /** Defaults to "Scheduled Maintenance" if not specified */
  title?: string
  /** Description of the maintenance, shown at status page */
  body: string
  /** Start time of the maintenance, in UNIX timestamp or ISO 8601 format */
  start: number | string
  /** End time of the maintenance, in UNIX timestamp or ISO 8601 format; if not specified, considered on-going */
  end?: number | string
  /** Color of the maintenance alert at status page, default to "yellow" */
  color?: string
}

export type PageConfigGroup = { [key: string]: string[] }

export type PageConfigLink = {
  link: string
  label: string
  highlight?: boolean
}

export type MonitorTarget = {
  /** `id` should be unique, history will be kept if the `id` remains constant */
  id: string
  /** `name` is used at status page and callback message */
  name: string
  /** `method` should be a valid HTTP Method */
  method: string
  /** `target` is a valid URL */
  target: string
  /** `tooltip` is ONLY used at status page to show a tooltip */
  tooltip?: string
  /** `statusPageLink` is ONLY used for clickable link at status page */
  statusPageLink?: string
  /** `hideLatencyChart` will hide status page latency chart if set to true */
  hideLatencyChart?: boolean
  /** `expectedCodes` is an array of acceptable HTTP response codes, default to 2xx if not specified */
  expectedCodes?: number[]
  /** `timeout` in millisecond, default to 10000 if not specified */
  timeout?: number
  /** Headers to be sent */
  headers?: { [key: string]: string | number }
  /** Body to be sent */
  body?: string
  /** If specified, the response must contain the keyword to be considered operational */
  responseKeyword?: string
  /** If specified, the response must NOT contain the keyword to be considered operational */
  responseForbiddenKeyword?: string
  /** 
   * if specified, will call the check proxy to check the monitor, mainly for geo-specific checks
   * refer to docs https://github.com/lyc8503/UptimeFlare/wiki/Check-proxy-setup before setting this value
   * currently supports `worker://`, `globalping://` and `http(s)://` proxies
   */
  checkProxy?: string
  /** If true, the check will fallback to local if the specified proxy is down */
  checkProxyFallback?: boolean
}

export type WorkerConfig<TEnv = Env> = {
  /** Write KV at most every N minutes unless the status changed, default to 3 */
  kvWriteCooldownMinutes?: number
  /** Enable HTTP Basic auth for status page & API by setting to `<USERNAME>:<PASSWORD>` */
  passwordProtection?: string
  /** Define all your monitors here */
  monitors: MonitorTarget[]
  /** Notification settings */
  notification?: Notification
  /** Callback functions for status changes and incidents */
  callbacks?: Callbacks<TEnv>
}

export type Notification = {
  /** Notification webhook settings; if not specified, no notification will be sent */
  webhook?: WebhookConfig
  /** Timezone used in notification messages, default to "Etc/GMT" */
  timeZone?: string
  /** 
   * grace period in minutes before sending a notification
   * notification will be sent only if the monitor is down for N continuous checks after the initial failure
   * if not specified, notification will be sent immediately
   */
  gracePeriod?: number
  /** Disable notification for monitors with specified ids */
  skipNotificationIds?: string[]
  /** Suppress extra notifications for error reason changes during an incident, default to false */
  skipErrorChangeNotification?: boolean
}

type SingleWebhook = {
  /** Webhook URL */
  url: string
  /** HTTP method; default to 'GET' for payloadType=param, 'POST' otherwise */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  /** Headers to be sent */
  headers?: { [key: string]: string | number }
  /** 
   * How to encode the payload; one of 'param', 'json' or 'x-www-form-urlencoded'
   * 'param': append url-encoded payload to URL search parameters
   * 'json': POST json payload as body, set content-type header to 'application/json'
   * 'x-www-form-urlencoded': POST url-encoded payload as body, set content-type header to 'x-www-form-urlencoded' */
  payloadType: 'param' | 'json' | 'x-www-form-urlencoded'
  /** Payload to be sent; $MSG will be replaced with the human-readable notification message */
  payload: any
  /** Timeout calling this webhook, in millisecond, default to 5000 */
  timeout?: number
}

export type WebhookConfig = SingleWebhook | SingleWebhook[]

export type Callbacks<TEnv = Env> = {
  /**
   * This callback will be called when there's a status change for any monitor
   * Write any TypeScript code here
   * This will not follow the grace period settings and will be called immediately when the status changes
   * You need to handle the grace period manually if you want to implement it
   */
  onStatusChange?: (
    env: TEnv,
    monitor: MonitorTarget,
    isUp: boolean,
    timeIncidentStart: number,
    timeNow: number,
    reason: string
  ) => Promise<any> | any
  /**
   * This callback will be called EVERY 1 MINUTE if there's an on-going incident for any monitor
   * Write any TypeScript code here
   */
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
