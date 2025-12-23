import Head from 'next/head'

import { Inter } from 'next/font/google'
import { MaintenanceConfig, MonitorTarget } from '@/types/config'
import { maintenances, pageConfig, workerConfig } from '@/uptime.config'
import Header from '@/components/Header'
import { Box, Button, Center, Container, Group, Select } from '@mantine/core'
import Footer from '@/components/Footer'
import { useEffect, useState } from 'react'
import MaintenanceAlert from '@/components/MaintenanceAlert'
import NoIncidentsAlert from '@/components/NoIncidents'
import { useTranslation } from 'react-i18next'

export const runtime = 'experimental-edge'
const inter = Inter({ subsets: ['latin'] })

function getSelectedMonth() {
  const hash = window.location.hash.replace('#', '')
  if (!hash) {
    const now = new Date()
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  }
  return hash.split('-').splice(0, 2).join('-')
}

function filterIncidentsByMonth(
  incidents: MaintenanceConfig[],
  monthStr: string
): (Omit<MaintenanceConfig, 'monitors'> & { monitors: MonitorTarget[] })[] {
  return incidents
    .filter((incident) => {
      const d = new Date(incident.start)
      const incidentMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      return incidentMonth === monthStr
    })
    .map((e) => ({
      ...e,
      monitors: (e.monitors || []).map((e) => workerConfig.monitors.find((mon) => mon.id === e)!),
    }))
    .sort((a, b) => (new Date(a.start) > new Date(b.start) ? -1 : 1))
}

function getPrevNextMonth(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1)
  const prev = new Date(date)
  prev.setMonth(prev.getMonth() - 1)
  const next = new Date(date)
  next.setMonth(next.getMonth() + 1)
  return {
    prev: prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0'),
    next: next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2, '0'),
  }
}

export default function IncidentsPage() {
  const { t } = useTranslation('common')
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>('')
  const [selectedMonth, setSelectedMonth] = useState(getSelectedMonth())

  useEffect(() => {
    const onHashChange = () => setSelectedMonth(getSelectedMonth())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const filteredIncidents = filterIncidentsByMonth(maintenances, selectedMonth)
  const monitorFilteredIncidents = selectedMonitor
    ? filteredIncidents.filter((i) => i.monitors.find((e) => e.id === selectedMonitor))
    : filteredIncidents

  const { prev, next } = getPrevNextMonth(selectedMonth)

  const monitorOptions = [
    { value: '', label: t('All') },
    ...workerConfig.monitors.map((monitor) => ({
      value: monitor.id,
      label: monitor.name,
    })),
  ]

  return (
    <>
      <Head>
        <title>{pageConfig.title}</title>
        <link rel="icon" href={pageConfig.favicon ?? '/favicon.png'} />
      </Head>

      <main className={inter.className}>
        <Header
          style={{
            marginBottom: '40px',
          }}
        />
        <Center>
          <Container size="md" style={{ width: '100%' }}>
            <Group justify="end" mb="md">
              <Select
                placeholder={t('Select monitor')}
                data={monitorOptions}
                value={selectedMonitor}
                onChange={setSelectedMonitor}
                clearable
                style={{ maxWidth: 300, float: 'right' }}
              />
            </Group>
            <Box>
              {monitorFilteredIncidents.length === 0 ? (
                <NoIncidentsAlert />
              ) : (
                monitorFilteredIncidents.map((incident, i) => (
                  <MaintenanceAlert key={i} maintenance={incident} />
                ))
              )}
            </Box>
            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={() => (window.location.hash = prev)}>
                {t('Backwards')}
              </Button>
              <Box style={{ alignSelf: 'center', fontWeight: 500, fontSize: 18 }}>
                {selectedMonth}
              </Box>
              <Button variant="default" onClick={() => (window.location.hash = next)}>
                {t('Forward')}
              </Button>
            </Group>
          </Container>
        </Center>
        <Footer />
      </main>
    </>
  )
}
