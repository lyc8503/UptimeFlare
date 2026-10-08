import Head from 'next/head'
import adminConfig from '@/deploy/admin.json'

import { Inter } from 'next/font/google'
import { MaintenanceConfig, MonitorTarget } from '@/types/config'
import { pageConfig } from '@/uptime.config'
import OverallStatus from '@/components/OverallStatus'
import Header from '@/components/Header'
import MonitorList from '@/components/MonitorList'
import { Center, Text } from '@mantine/core'
import MonitorDetail from '@/components/MonitorDetail'
import Footer from '@/components/Footer'
import { useTranslation } from 'react-i18next'
import { CompactedMonitorStateWrapper, getFromStore } from '@/worker/src/store'
import { useEffect, useState } from 'react'
import type { GetServerSidePropsContext } from 'next'

export const runtime = 'experimental-edge'
const inter = Inter({ subsets: ['latin'] })

export default function Home({
  compactedStateStr,
  monitors,
  initialMaintenances,
}: {
  compactedStateStr: string
  monitors: MonitorTarget[]
  initialMaintenances: MaintenanceConfig[]
  tooltip?: string
  statusPageLink?: string
}) {
  const { t } = useTranslation('common')
  const [maintenances, setMaintenances] = useState(initialMaintenances)
  useEffect(() => {
    if (!adminConfig.enabled) return
    const controller = new AbortController()
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const response = await fetch('/api/maintenances', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (response.ok) {
          const data = (await response.json()) as { maintenances: MaintenanceConfig[] }
          setMaintenances(data.maintenances)
        }
      } catch {
        // Keep the last known events during a temporary network failure.
      }
    }
    const interval = setInterval(refresh, 15_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      controller.abort()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  let state = new CompactedMonitorStateWrapper(compactedStateStr).uncompact()

  // Specify monitorId in URL hash to view a specific monitor (can be used in iframe)
  const monitorId = window.location.hash.substring(1)
  if (monitorId) {
    const monitor = monitors.find((monitor) => monitor.id === monitorId)
    if (!monitor || !state) {
      return <Text fw={700}>{t('Monitor not found', { id: monitorId })}</Text>
    }
    return (
      <div style={{ maxWidth: '810px' }}>
        <MonitorDetail monitor={monitor} state={state} />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{pageConfig.title}</title>
        <link rel="icon" href={pageConfig.favicon ?? '/favicon.png'} />
      </Head>

      <main className={inter.className}>
        <Header />

        <OverallStatus state={state} monitors={monitors} maintenances={maintenances} />
        {state.lastUpdate === 0 ? (
          <Center>
            <Text fw={700}>{t('Monitor State not defined')}</Text>
          </Center>
        ) : (
          <div>
            <MonitorList monitors={monitors} state={state} />
          </div>
        )}

        <Footer />
      </main>
    </>
  )
}

export async function getServerSideProps({ res }: GetServerSidePropsContext) {
  const { allMaintenances } = await import('@/server/maintenance')
  if (adminConfig.enabled) res.setHeader('Cache-Control', 'no-store')
  const { workerConfig, maintenances } = await import('@/uptime.config')
  // Read state as string from storage, to avoid hitting server-side cpu time limit
  const [compactedStateStr, initialMaintenances] = await Promise.all([
    getFromStore(process.env, 'state'),
    allMaintenances(process.env.UPTIMEFLARE_D1, maintenances),
  ])

  // Only present these values to client
  const monitors = workerConfig.monitors.map((monitor) => {
    return {
      id: monitor.id,
      name: monitor.name,
      ...(monitor.tooltip === undefined ? {} : { tooltip: monitor.tooltip }),
      ...(monitor.statusPageLink === undefined ? {} : { statusPageLink: monitor.statusPageLink }),
      ...(monitor.hideLatencyChart === undefined
        ? {}
        : { hideLatencyChart: monitor.hideLatencyChart }),
    }
  })

  return { props: { compactedStateStr, monitors, initialMaintenances } }
}
