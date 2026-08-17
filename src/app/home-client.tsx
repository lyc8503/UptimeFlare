'use client'
import type { MonitorTarget } from '@/types/config'
import { maintenances } from '@/uptime.config'
import OverallStatus from '@/app/components/OverallStatus'
import Header from '@/app/components/Header'
import MonitorList from '@/app/components/MonitorList'
import { Center, Text } from '@mantine/core'
import MonitorDetail from '@/app/components/MonitorDetail'
import Footer from '@/app/components/Footer'
import { useTranslation } from 'react-i18next'
import { CompactedMonitorStateWrapper } from '@/server/store'

export default function HomeClient({
  compactedStateStr,
  monitors,
}: {
  compactedStateStr: string | null
  monitors: MonitorTarget[]
}) {
  const { t } = useTranslation('common')
  const state = new CompactedMonitorStateWrapper(compactedStateStr).uncompact()

  // Specify monitorId in URL hash to view a specific monitor (can be used in iframe)
  const monitorId = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
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
      <main>
        <Header />

        {state.lastUpdate === 0 ? (
          <Center>
            <Text fw={700}>{t('Monitor State not defined')}</Text>
          </Center>
        ) : (
          <div>
            <OverallStatus state={state} monitors={monitors} maintenances={maintenances} />
            <MonitorList monitors={monitors} state={state} />
          </div>
        )}

        <Footer />
      </main>
    </>
  )
}
