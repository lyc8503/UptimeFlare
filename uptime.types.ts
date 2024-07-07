export type MonitorState = {
  version: number
  lastUpdate: number
  overallUp: number
  overallDown: number
  incident: Record<
    string,
    {
      start: number[]
      end: number | undefined // undefined if it's still open
      error: string[]
    }[]
  >

  latency: Record<
    string,
    {
      recent: {
        loc: string
        ping: number
        time: number
      }[] // recent 12 hour data, 2 min interval
      all: {
        loc: string
        ping: number
        time: number
      }[] // all data in 90 days, 1 hour interval
    }
  >
}

export type MonitorTarget = {
  id: string
  name: string
  method: string // "TCP_PING" or Http Method (e.g. GET, POST, OPTIONS, etc.)
  target: string // url for http, hostname:port for tcp
  tooltip?: string
  statusPageLink?: string
  checkLocationWorkerRoute?: string

  // HTTP Code
  expectedCodes?: number[]
  timeout?: number
  headers?: Record<string, string | undefined>
  body?: BodyInit
  responseKeyword?: string
}

export type UptimeConfig = {
  kvWriteCooldownMinutes: number
  monitors: MonitorTarget[]
  notification?: {
    appriseApiServer?: string
    recipientUrl?: string
    timeZone?: string
    gracePeriod?: number
  }
  callbacks?: {
    onStatusChange?: (
      env: any,
      monitor: any,
      isUp: boolean,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => Promise<any>
    onIncident?: (
      env: any,
      monitor: any,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => Promise<any>
  }
}

export type PageConfig = {
  title: string
  links: Array<{
    link: string
    label: string
    highlight?: boolean
  }>
}
