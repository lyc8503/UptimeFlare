import { MonitorState, MonitorTarget } from '@/uptime.types'
import { Card, Center, Divider } from '@mantine/core'
import MonitorDetail from './MonitorDetail'

export default function MonitorList({ monitors, state }: { monitors: any; state: MonitorState }) {
  return (
    <Center>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        ml="xl"
        mr="xl"
        mt="xl"
        withBorder
        style={{ width: '865px' }}
      >
        {monitors.map((monitor: MonitorTarget) => (
          <div key={monitor.id}>
            <Card.Section ml="xs" mr="xs">
              <MonitorDetail monitor={monitor} state={state} />
            </Card.Section>
            <Divider />
          </div>
        ))}
      </Card>
    </Center>
  )
}
