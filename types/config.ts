import type { Env } from '../worker/src'

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

export type WorkerConfig<TEnv = Env> = {
  kvWriteCooldownMinutes: number
  passwordProtection?: string
  monitors: MonitorTarget[]
  notification?: Notification
  callbacks?: Callbacks<TEnv>
}

export type Notification = {
  appriseApiServer?: string
  recipientUrl?: string
  timeZone?: string
  gracePeriod?: number
  skipNotificationIds?: string[]
}

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
