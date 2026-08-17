import { workerConfig } from '@/uptime.config'
import type { MonitorTarget } from '@/types/config'
import IncidentsClient from './incidents-client'

export const dynamic = 'force-dynamic'

export default function IncidentsPage() {
  const monitors = workerConfig.monitors.map((monitor) => ({
    id: monitor.id,
    name: monitor.name,
  })) as MonitorTarget[]

  return <IncidentsClient monitors={monitors} />
}
