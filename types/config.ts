export type PageConfig = {
  title?: string
  links?: PageConfigLink[]
  group?: PageConfigGroup
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

export type WorkerConfig = {
  kvWriteCooldownMinutes: number
  passwordProtection?: string
  monitors: MonitorTarget[]
  notification?: Notification
  callbacks?: Callbacks
}

export type Notification = {
  appriseApiServer?: string
  recipientUrl?: string
  timeZone?: string
  gracePeriod?: number
  skipNotificationIds?: string[]
}

export type Callbacks = {
  onStatusChange: (
    env: any,
    monitor: any,
    isUp: boolean,
    timeIncidentStart: number,
    timeNow: number,
    reason: string
  ) => Promise<any>
  onIncident: (
    env: any,
    monitor: any,
    timeIncidentStart: number,
    timeNow: number,
    reason: string
  ) => Promise<any>
}

export type MonitorState = {
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
