import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getFromStore } from '@/server/store'
import { workerConfig } from '@/uptime.config'
import type { MonitorTarget } from '@/types/config'
import HomeClient from './home-client'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const compactedStateStr = await getFromStore(getCloudflareContext().env as any, 'state')

  // Only expose these fields to the client (never headers/body/credentials).
  const monitors = workerConfig.monitors.map((monitor) => ({
    id: monitor.id,
    name: monitor.name,
    tooltip: monitor?.tooltip,
    statusPageLink: monitor?.statusPageLink,
    hideLatencyChart: monitor?.hideLatencyChart,
  })) as unknown as MonitorTarget[]

  return <HomeClient compactedStateStr={compactedStateStr} monitors={monitors} />
}
