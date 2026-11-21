import Head from 'next/head'
import Link from 'next/link'
import { MaintenanceConfig, MonitorTarget } from '@/types/config'
import { maintenances as configMaintenances, pageConfig } from '@/uptime.config'
import OverallStatus from '@/components/OverallStatus'
import Header from '@/components/Header'
import MonitorList from '@/components/MonitorList'
import Footer from '@/components/Footer'
import UptimeBars from '@/components/UptimeBars'
import { CompactedMonitorStateWrapper, getFromStore } from '@/worker/src/store'

export const runtime = 'experimental-edge'

export default function Home({
  compactedStateStr,
  monitors,
  maintenances,
}: {
  compactedStateStr: string | null
  monitors: MonitorTarget[]
  maintenances: MaintenanceConfig[]
}) {
  const state = new CompactedMonitorStateWrapper(compactedStateStr).uncompact()

  // #monitor-id shows one service's bars on its own (for embedding in an iframe).
  const monitorId = window.location.hash.substring(1)
  if (monitorId) {
    const monitor = monitors.find((m) => m.id === monitorId)
    return (
      <main className="st-embed">
        {monitor && state.incident[monitor.id] ? (
          <UptimeBars monitor={monitor} state={state} />
        ) : (
          <p>No service called &ldquo;{monitorId}&rdquo;.</p>
        )}
      </main>
    )
  }

  return (
    <>
      <Head>
        <title>{pageConfig.title}</title>
        <meta name="description" content="Live status of Cottage's website, dashboard and app hosting, checked every minute." />
      </Head>
      <Header current="status" />
      <main className="st-main">
        <div className="st-container st-container--narrow">
          <OverallStatus state={state} monitors={monitors} maintenances={maintenances} />
          <MonitorList monitors={monitors} state={state} maintenances={maintenances} />
          <p className="st-note">
            Uptime covers the last 90 days. Planned maintenance and incident updates are listed under{' '}
            <Link href="/incidents">Incident history</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}

export async function getServerSideProps({ query }: { query: Record<string, string | string[] | undefined> }) {
  const { workerConfig } = await import('@/uptime.config')
  const monitors = workerConfig.monitors.map((m) => ({
    id: m.id,
    name: m.name,
    tooltip: m.tooltip ?? null,
    statusPageLink: m.statusPageLink ?? null,
    hideLatencyChart: m.hideLatencyChart ?? null,
  }))

  // `npm run dev` has no D1 database: show sample data instead (dev/sample.ts).
  if (process.env.NODE_ENV === 'development' && !(process.env as any).UPTIMEFLARE_D1) {
    const { sampleState, sampleNotices } = await import('@/dev/sample')
    return { props: { compactedStateStr: sampleState(workerConfig.monitors, String(query.sample ?? '')), monitors, maintenances: sampleNotices(String(query.sample ?? '')) } }
  }

  // Read the state as a string, so the server stays inside its CPU limit.
  const compactedStateStr = await getFromStore(process.env as any, 'state')
  return { props: { compactedStateStr, monitors, maintenances: configMaintenances } }
}
