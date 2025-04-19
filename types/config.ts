export type PageConfig = {
  title?: string
  links?: PageConfigLink[]
  group?: PageConfigGroup
}

export type Maintenances = {
  // title to display
  title: string
  // array of monitor ids
  monitors?: string[]
  // body message
  body?: string
  // start date
  start?: Date
  // end Date
  end?: Date
  // display color
  color?: string
}

export type PageConfigGroup = { [key: string]: string[] }

export type PageConfigLink = {
  link: string
  label: string
  highlight?: boolean
}

export type WorkerConfig = {
  kvWriteCooldownMinutes: number
  monitors: Monitor[]
  notification?: Notification
  callbacks?: Callbacks
}

export type Monitor = {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'TCP_PING'
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
