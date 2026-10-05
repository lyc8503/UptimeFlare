import type { Env } from '.'
import type {
  IncidentRecord,
  LatencyRecord,
  MonitorState,
  MonitorStateCompacted,
} from '../../types/config'

export async function getFromStore(env: Env, key: string): Promise<string | null> {
  const stmt = env.UPTIMEFLARE_D1.prepare('SELECT value FROM uptimeflare WHERE key = ?')
  const result = await stmt.bind(key).first<{ value: string }>()
  return result?.value || null
}

export async function setToStoreIfUnchanged(
  env: Env,
  key: string,
  value: string,
  expectedValue: string | null
): Promise<boolean> {
  if (expectedValue === null) {
    const result = await env.UPTIMEFLARE_D1.prepare(
      'INSERT INTO uptimeflare (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING;'
    )
      .bind(key, value)
      .run()
    return (result.meta.changes ?? 0) > 0
  }

  const result = await env.UPTIMEFLARE_D1.prepare(
    'UPDATE uptimeflare SET value = ? WHERE key = ? AND value = ?;'
  )
    .bind(value, key, expectedValue)
    .run()
  return (result.meta.changes ?? 0) > 0
}

export class CompactedMonitorStateWrapper {
  data: MonitorStateCompacted

  constructor(compactedStateStr: string | null) {
    if (!compactedStateStr) {
      // Initialize empty state
      this.data = {
        lastUpdate: 0,
        overallUp: 0,
        overallDown: 0,
        notifiedIncidentStart: {},
        pendingRecovery: {},
        pendingErrorChange: {},
        notificationLastUpdate: {},
        monitorLastUpdate: {},
        incident: {},
        latency: {},
      }
      return
    }
    this.data = JSON.parse(compactedStateStr)
    this.data.notifiedIncidentStart ??= {}
    this.data.pendingRecovery ??= {}
    this.data.pendingErrorChange ??= {}
    this.data.notificationLastUpdate ??= {}
    this.data.monitorLastUpdate ??= {}
  }

  getCompactedStateStr(): string {
    return JSON.stringify(this.data)
  }

  // Don't use this method at server-side
  uncompact(): MonitorState {
    let state: MonitorState = {
      lastUpdate: this.data.lastUpdate,
      overallUp: this.data.overallUp,
      overallDown: this.data.overallDown,
      incident: {},
      latency: {},
    }

    const hex2Uint8Arr = (hex: string): Uint8Array => {
      // @ts-expect-error This method is not available in Node.js 22.x, but available in Cloudflare Workers and new browsers
      if (Uint8Array.fromHex) {
        // @ts-expect-error
        return Uint8Array.fromHex(hex)
      } else {
        console.warn('Uint8Array.fromHex is not available, using parseInt as fallback. Consider upgrading your browser.')
        const ret = new Uint8Array(hex.length / 2)
        for (let i = 0; i < hex.length; i += 2) {
          ret[i / 2] = parseInt(hex.slice(i, i + 2), 16)
        }
        return ret
      }
    }

    Object.keys(this.data.incident).forEach((monitorId) => {
      state.incident[monitorId] = []
      const incidents = this.data.incident[monitorId]

      if (
        incidents.start.length !== incidents.end.length ||
        incidents.start.length !== incidents.error.length
      ) {
        throw new Error(
          'Inconsistent incident data lengths, please report an issue at https://github.com/lyc8503/UptimeFlare'
        )
      }

      for (let i = 0; i < incidents.start.length; i++) {
        state.incident[monitorId].push({
          start: incidents.start[i],
          end: incidents.end[i],
          error: incidents.error[i],
        })
      }
    })

    Object.keys(this.data.latency).forEach((monitorId) => {
      state.latency[monitorId] = []
      const latencies = this.data.latency[monitorId]
      const locUncompacted: string[] = []
      latencies.loc.c.forEach((count, index) => {
        for (let i = 0; i < count; i++) {
          locUncompacted.push(latencies.loc.v[index])
        }
      })

      const timeArr = new Uint32Array(hex2Uint8Arr(latencies.time).buffer)
      const pingArr = new Uint16Array(hex2Uint8Arr(latencies.ping).buffer)

      if (timeArr.length !== pingArr.length || timeArr.length !== locUncompacted.length) {
        throw new Error(
          'Inconsistent latency data lengths, please report an issue at https://github.com/lyc8503/UptimeFlare.'
        )
      }

      for (let i = 0; i < timeArr.length; i++) {
        state.latency[monitorId].push({
          time: timeArr[i],
          ping: pingArr[i],
          loc: locUncompacted[i],
        })
      }
    })

    return state
  }

  incidentLen(monitorId: string): number {
    const incidents = this.data.incident[monitorId]
    if (!incidents) return 0
    return incidents.start.length
  }

  getIncident(monitorId: string, index: number): IncidentRecord {
    const incidents = this.data.incident[monitorId]
    if (!incidents || index < 0 || index >= incidents.start.length) {
      throw new Error('Index out of bounds or monitor not found')
    }
    return {
      start: incidents.start[index],
      end: incidents.end[index],
      error: incidents.error[index],
    }
  }

  setIncident(monitorId: string, index: number, incident: IncidentRecord) {
    const incidents = this.data.incident[monitorId]
    if (!incidents || index < 0 || index >= incidents.start.length) {
      throw new Error('Index out of bounds or monitor not found')
    }
    incidents.start[index] = incident.start
    incidents.end[index] = incident.end
    incidents.error[index] = incident.error
  }

  appendIncident(monitorId: string, incident: IncidentRecord) {
    let incidents = this.data.incident[monitorId]
    if (!incidents) {
      // Initialize incident arrays
      this.data.incident[monitorId] = {
        start: [],
        end: [],
        error: [],
      }
      incidents = this.data.incident[monitorId]
    }
    incidents.start.push(incident.start)
    incidents.end.push(incident.end)
    incidents.error.push(incident.error)
  }

  shiftIncident(monitorId: string) {
    const incidents = this.data.incident[monitorId]
    incidents.start.shift()
    incidents.end.shift()
    incidents.error.shift()
  }

  unshiftIncident(monitorId: string, incident: IncidentRecord) {
    const incidents = this.data.incident[monitorId]
    incidents.start.unshift(incident.start)
    incidents.end.unshift(incident.end)
    incidents.error.unshift(incident.error)
  }

  latencyLen(monitorId: string): number {
    const latencies = this.data.latency[monitorId]
    if (!latencies) return 0
    return latencies.ping.length / 4 // Uint16Array, 4 characters per entry in hex
  }

  hasMonitorData(monitorId: string): boolean {
    return this.incidentLen(monitorId) > 0 && this.latencyLen(monitorId) > 0
  }

  private touchNotificationState(monitorId: string) {
    this.data.notificationLastUpdate ??= {}
    this.data.notificationLastUpdate[monitorId] = Math.max(
      Date.now(),
      (this.data.notificationLastUpdate[monitorId] ?? 0) + 1
    )
  }

  wasDownNotificationSent(monitorId: string, incidentStart: number): boolean {
    return this.data.notifiedIncidentStart?.[monitorId] === incidentStart
  }

  markDownNotificationSent(monitorId: string, incidentStart: number) {
    this.data.notifiedIncidentStart ??= {}
    this.data.notifiedIncidentStart[monitorId] = incidentStart
    this.touchNotificationState(monitorId)
  }

  clearDownNotificationSent(monitorId: string, incidentStart?: number) {
    if (
      (incidentStart === undefined ||
        this.data.notifiedIncidentStart?.[monitorId] === incidentStart) &&
      this.data.notifiedIncidentStart?.[monitorId] !== undefined
    ) {
      delete this.data.notifiedIncidentStart[monitorId]
      this.touchNotificationState(monitorId)
    }
  }

  getPendingRecovery(monitorId: string) {
    return this.data.pendingRecovery?.[monitorId]
  }

  setPendingRecovery(monitorId: string, incidentStart: number, recoveredAt: number) {
    this.data.pendingRecovery ??= {}
    this.data.pendingRecovery[monitorId] = { incidentStart, recoveredAt }
    this.touchNotificationState(monitorId)
  }

  clearPendingRecovery(monitorId: string) {
    if (this.data.pendingRecovery?.[monitorId] !== undefined) {
      delete this.data.pendingRecovery[monitorId]
      this.touchNotificationState(monitorId)
    }
  }

  getPendingErrorChange(monitorId: string) {
    return this.data.pendingErrorChange?.[monitorId]
  }

  setPendingErrorChange(
    monitorId: string,
    incidentStart: number,
    changedAt: number,
    reason: string
  ) {
    this.data.pendingErrorChange ??= {}
    this.data.pendingErrorChange[monitorId] = { incidentStart, changedAt, reason }
    this.touchNotificationState(monitorId)
  }

  clearPendingErrorChange(monitorId: string) {
    if (this.data.pendingErrorChange?.[monitorId] !== undefined) {
      delete this.data.pendingErrorChange[monitorId]
      this.touchNotificationState(monitorId)
    }
  }

  setMonitorLastUpdate(monitorId: string, checkedAt: number) {
    this.data.monitorLastUpdate ??= {}
    this.data.monitorLastUpdate[monitorId] = checkedAt
  }

  copyMonitorStateFrom(source: CompactedMonitorStateWrapper, monitorId: string): boolean {
    let copied = false

    const sourceUpdate = source.data.monitorLastUpdate?.[monitorId] ?? 0
    const currentUpdate = this.data.monitorLastUpdate?.[monitorId] ?? 0
    if (sourceUpdate > currentUpdate) {
      if (source.data.incident[monitorId]) {
        this.data.incident[monitorId] = source.data.incident[monitorId]
      } else {
        delete this.data.incident[monitorId]
      }
      if (source.data.latency[monitorId]) {
        this.data.latency[monitorId] = source.data.latency[monitorId]
      } else {
        delete this.data.latency[monitorId]
      }

      this.data.monitorLastUpdate ??= {}
      this.data.monitorLastUpdate[monitorId] = sourceUpdate
      copied = true
    }

    // Notification delivery is an external side effect and therefore has its
    // own version. Preserve it even when a newer concurrent health check wins.
    const sourceNotificationUpdate = source.data.notificationLastUpdate?.[monitorId] ?? 0
    const currentNotificationUpdate = this.data.notificationLastUpdate?.[monitorId] ?? 0
    if (sourceNotificationUpdate > currentNotificationUpdate) {
      this.data.notifiedIncidentStart ??= {}
      if (source.data.notifiedIncidentStart?.[monitorId] !== undefined) {
        this.data.notifiedIncidentStart[monitorId] =
          source.data.notifiedIncidentStart[monitorId]
      } else {
        delete this.data.notifiedIncidentStart[monitorId]
      }

      this.data.pendingRecovery ??= {}
      if (source.data.pendingRecovery?.[monitorId] !== undefined) {
        this.data.pendingRecovery[monitorId] = source.data.pendingRecovery[monitorId]
      } else {
        delete this.data.pendingRecovery[monitorId]
      }

      this.data.pendingErrorChange ??= {}
      if (source.data.pendingErrorChange?.[monitorId] !== undefined) {
        this.data.pendingErrorChange[monitorId] = source.data.pendingErrorChange[monitorId]
      } else {
        delete this.data.pendingErrorChange[monitorId]
      }

      this.data.notificationLastUpdate ??= {}
      this.data.notificationLastUpdate[monitorId] = sourceNotificationUpdate

      // A concurrent newer check may already have closed the incident before
      // it observed the successfully delivered DOWN. Queue the matching UP.
      const notifiedStart = this.data.notifiedIncidentStart[monitorId]
      if (notifiedStart !== undefined && !this.data.pendingRecovery[monitorId]) {
        for (let index = this.incidentLen(monitorId) - 1; index >= 0; index--) {
          const incident = this.getIncident(monitorId, index)
          if (incident.start[0] === notifiedStart && incident.end !== null) {
            this.data.pendingRecovery[monitorId] = {
              incidentStart: notifiedStart,
              recoveredAt: incident.end,
            }
            break
          }
        }
      }

      copied = true
    }

    return copied
  }

  appendLatency(monitorId: string, record: LatencyRecord) {
    let latencies = this.data.latency[monitorId]
    if (!latencies) {
      // Initialize latency arrays
      this.data.latency[monitorId] = {
        time: '',
        ping: '',
        loc: {
          c: [],
          v: [],
        },
      }
      latencies = this.data.latency[monitorId]
    }

    // @ts-expect-error
    latencies.time += new Uint8Array(new Uint32Array([record.time]).buffer).toHex()
    // @ts-expect-error
    latencies.ping += new Uint8Array(new Uint16Array([record.ping]).buffer).toHex()

    if (latencies.loc.v[latencies.loc.v.length - 1] !== record.loc) {
      latencies.loc.c.push(1)
      latencies.loc.v.push(record.loc)
    } else {
      latencies.loc.c[latencies.loc.c.length - 1] += 1
    }
  }

  getFirstLatency(monitorId: string): LatencyRecord {
    let latencies = this.data.latency[monitorId]

    return {
      // @ts-expect-error
      time: new Uint32Array(Uint8Array.fromHex(latencies.time.slice(0, 8)).buffer)[0],
      // @ts-expect-error
      ping: new Uint16Array(Uint8Array.fromHex(latencies.ping.slice(0, 4)).buffer)[0],
      loc: latencies.loc.v[0],
    }
  }

  getLastLatency(monitorId: string): LatencyRecord {
    let latencies = this.data.latency[monitorId]

    return {
      // @ts-expect-error
      time: new Uint32Array(Uint8Array.fromHex(latencies.time.slice(-8)).buffer)[0],
      // @ts-expect-error
      ping: new Uint16Array(Uint8Array.fromHex(latencies.ping.slice(-4)).buffer)[0],
      loc: latencies.loc.v[latencies.loc.v.length - 1],
    }
  }

  recalculateOverallStatus(monitorIds: string[]) {
    this.data.overallUp = 0
    this.data.overallDown = 0

    for (const monitorId of monitorIds) {
      if (!this.hasMonitorData(monitorId)) {
        // Unknown or partially migrated monitors must not be presented as
        // operational while their first complete check has not run yet.
        this.data.overallDown++
        continue
      }

      const incidentCount = this.incidentLen(monitorId)
      const lastIncident = this.getIncident(monitorId, incidentCount - 1)
      if (lastIncident.end === null) {
        this.data.overallDown++
      } else {
        this.data.overallUp++
      }
    }
  }

  unshiftLatency(monitorId: string) {
    let latencies = this.data.latency[monitorId]

    latencies.time = latencies.time.slice(8)
    latencies.ping = latencies.ping.slice(4)

    latencies.loc.c[0] -= 1
    if (latencies.loc.c[0] === 0) {
      latencies.loc.c.shift()
      latencies.loc.v.shift()
    }
  }
}
