import type { MaintenanceConfig } from '../types/config'

export type MaintenanceEvent = MaintenanceConfig & {
  id: string
  title: string
  start: number
  end?: number
  createdAt: number
  cancelledAt?: number
  source: 'dashboard' | 'config'
}

export const maintenanceDurations = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '0', label: 'Until I end it' },
]

export function maintenanceStatus(
  event: MaintenanceConfig & { cancelledAt?: number },
  now = Date.now()
) {
  if (event.cancelledAt !== undefined) return 'Cancelled'
  if (event.end !== undefined && new Date(event.end).getTime() <= now) return 'Completed'
  return new Date(event.start).getTime() > now ? 'Upcoming' : 'Active'
}

export function monitorInMaintenance(events: MaintenanceConfig[], monitorId: string, now: number) {
  return events.some(
    (event) =>
      maintenanceStatus(event, now) === 'Active' &&
      (!event.monitors?.length || event.monitors.includes(monitorId))
  )
}
