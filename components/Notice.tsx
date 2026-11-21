import { MaintenanceConfig, MonitorTarget } from '@/types/config'
import { formatDateTime, noticeTone } from '@/util/status'
import { Banner } from './brand'

function when(n: MaintenanceConfig) {
  const now = new Date()
  const start = formatDateTime(n.start)
  const end = n.end ? formatDateTime(n.end) : null
  if (new Date(n.start) > now) return end ? `Planned for ${start} to ${end}` : `Planned for ${start}`
  if (!n.end || new Date(n.end) > now) return end ? `Since ${start}, expected to end ${end}` : `Since ${start}`
  return `${start} to ${end}`
}

// A posted notice (incident update or maintenance) from `maintenances` in uptime.config.ts.
export default function Notice({
  notice,
  monitors,
  upcoming = false,
}: {
  notice: MaintenanceConfig
  monitors: MonitorTarget[]
  upcoming?: boolean
}) {
  const affected = (notice.monitors || []).map(
    (id) => monitors.find((m) => m.id === id)?.name ?? id
  )
  const tone = upcoming ? 'info' : noticeTone(notice.color)
  return (
    <Banner tone={tone as any} title={notice.title || (upcoming ? 'Planned maintenance' : 'Maintenance')}>
      <p className="st-notice__when">{when(notice)}</p>
      <p className="st-notice__body">{notice.body}</p>
      {affected.length > 0 && <p className="st-notice__affected">Affects: {affected.join(', ')}</p>}
    </Banner>
  )
}
