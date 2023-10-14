import { Center, Space, Title } from '@mantine/core'
import { IconCircleCheck, IconAlertCircle } from '@tabler/icons-react'

export default function OverallStatus({ state }: { state: { overallUp: number, overallDown: number, lastUpdate: number }}) {

  let statusString = ''
  let icon = <IconAlertCircle style={{ width: 64, height: 64 }} />
  if (state.overallUp === 0 && state.overallDown === 0) {
    statusString = 'No data yet'
  } else if (state.overallUp === 0) {
    statusString = 'All down'
  } else if (state.overallDown === 0) {
    statusString = 'All up'
    icon = <IconCircleCheck style={{ width: 64, height: 64 }} />
  } else {
    statusString = `${state.overallUp} up, ${state.overallDown} down`
  }

  return (<>
    <Center>
      {icon}
    </Center>
    <Space h="md"/>
    <Center>
      <Title order={1}>{statusString}</Title>
    </Center>
    <Center>
      <Title order={5}>Last updated on: {new Date(state.lastUpdate * 1000).toLocaleString()}</Title>
    </Center>
  </>)
}

