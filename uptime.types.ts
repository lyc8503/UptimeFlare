type MonitorState = {
  lastUpdate: number,
  overallUp: number,
  overallDown: number,
  incident: Record<string, {
    start: number[],
    end: number | undefined,  // undefined if it's still open
    error: string[]
  }[]>,

  latency: Record<string, {
    recent: {
      loc: string,
      ping: number,
      time: number
    }[],  // recent 12 hour data, 2 min interval
    all: {
      loc: string,
      ping: number,
      time: number
    }[]  // all data in 90 days, 1 hour interval 
  }>
}

// TODO
type MonitorTarget = {
  id: string,
  name: string,
  method: string,  // "TCP_PING" or Http Method (e.g. GET, POST, OPTIONS, etc.)
  target: string,  // url for http, hostname:port for tcp

  expectedCode?: number[],
  timeout?: number,
  headers?: Record<string, string>,
  body?: string
}


export type { MonitorState, MonitorTarget }
