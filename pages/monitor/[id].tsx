import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { MonitorState, MonitorTarget, MaintenanceConfig } from '@/types/config'
import { maintenances, workerConfig } from '@/uptime.config'
import MonitorDetail from '@/components/MonitorDetail'
import DetailChart from '@/components/DetailChart'
import MaintenanceAlert from '@/components/MaintenanceAlert'
import { Text, Center, Card } from '@mantine/core'
import Layout from '@/components/Layout'
import IncidentList from '@/components/IncidentList'

export const runtime = 'experimental-edge'

type Props = {
  monitor: MonitorTarget | null
  state: string
  maintenance: Omit<MaintenanceConfig, 'monitors'> & { monitors?: MonitorTarget[] }
}

export default function MonitorPage({ monitor, state, maintenance }: Props) {
  const router = useRouter()
  const parsedState: MonitorState | null = JSON.parse(state)
  if (router.isFallback) {
    return <Text>Loading...</Text>
  }
  if (!monitor || !parsedState) {
    return (
      <Center>
        <Text fw={700}>Monitor not found or state unavailable!</Text>
      </Center>
    )
  }

  const incidents = [...(parsedState.incident?.[monitor.id] || [])] // need to clone to not modify origin with shift below
  if (incidents) incidents.shift() // remove dummy entry
  return (
    <Layout>
      {maintenance && <MaintenanceAlert maintenance={maintenance} />}
      <Card mt={maintenance && 'lg'}>
        <MonitorDetail link={monitor.statusPageLink} monitor={monitor} state={parsedState} />
      </Card>
      {incidents.length > 0 && (
        <Card mt="lg">
          <IncidentList incidents={incidents} />
        </Card>
      )}
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params!.id as string
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  const monitor = workerConfig.monitors.find((m) => m.id === id) || null
  // Read state as string from KV, to avoid hitting server-side cpu time limit
  const state = (await UPTIMEFLARE_STATE?.get('state')) as unknown as MonitorState

  // Find maintenance for this monitor, if any
  const maintenance =
    maintenances
      .filter((m) => m.monitors && m.monitors.includes(id))
      .map((e) => {
        return {
          ...e,
          monitors: e.monitors?.map((mon) =>
            workerConfig.monitors.find((confMon) => confMon.id === mon)
          ),
        }
      })[0] || null

  return {
    props: {
      monitor,
      state,
      maintenance,
    },
  }
}
