import { Maintenances } from '@/types/config'
import { Alert, Card, Center, Container, List, ListItem, Text, Title } from '@mantine/core'
import { IconCircleCheck, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

function useWindowVisibility() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('visibility change', document.visibilityState)
      setIsVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return isVisible
}

export default function OverallStatus({
  state,
  maintenances,
}: {
  state: { overallUp: number; overallDown: number; lastUpdate: number }
  maintenances?: Maintenances[]
}) {
  let statusString = ''
  let icon = <IconAlertCircle style={{ width: 64, height: 64, color: '#b91c1c' }} />
  if (state.overallUp === 0 && state.overallDown === 0) {
    statusString = 'No data yet'
  } else if (state.overallUp === 0) {
    statusString = 'All systems not operational'
  } else if (state.overallDown === 0) {
    statusString = 'All systems operational'
    icon = <IconCircleCheck style={{ width: 64, height: 64, color: '#059669' }} />
  } else {
    statusString = `Some systems not operational (${state.overallDown} out of ${
      state.overallUp + state.overallDown
    })`
  }

  const [openTime] = useState(Math.round(Date.now() / 1000))
  const [currentTime, setCurrentTime] = useState(Math.round(Date.now() / 1000))
  const isWindowVisible = useWindowVisibility()

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isWindowVisible) {
        return
      }
      if (currentTime - state.lastUpdate > 300 && currentTime - openTime > 30) {
        // trigger a re-fetch
        window.location.reload()
      }
      setCurrentTime(Math.round(Date.now() / 1000))
    }, 1000)

    return () => clearInterval(interval)
  })

  // @TODO make dynamic
  const showMaintenance = maintenances

  return (
    <>
      <Container size="md" mt="xl" style={{ width: '897px' }}>
        <Center>{icon}</Center>
        <Title mt="sm" style={{ textAlign: 'center' }} order={1}>
          {statusString}
        </Title>
        <Title mt="sm" style={{ textAlign: 'center', color: '#70778c' }} order={5}>
          Last updated on:{' '}
          {`${new Date(state.lastUpdate * 1000).toLocaleString()} (${
            currentTime - state.lastUpdate
          } sec ago)`}
        </Title>
        {showMaintenance &&
          maintenances.map((maintenance, idx) => (
            <Alert
              key={idx}
              icon={<IconInfoCircle />}
              title={maintenance.title}
              color={maintenance.color || 'primary'}
              mt="md"
              withCloseButton={false}
            >
              <Text>
                {maintenance.start && (
                  <>
                    <b>From:</b> {maintenance.start.toLocaleString()}
                    <br />
                  </>
                )}
                {maintenance.end && (
                  <>
                    <b>To:</b> {maintenance.end.toLocaleString()}
                  </>
                )}
              </Text>
              {maintenance.body && <Text mt="xs">{maintenance.body}</Text>}
              {maintenance.monitors && maintenance.monitors.length > 0 && (
                <>
                  <Text mt="xs">
                    <b>Affected components:</b>
                  </Text>
                  <List size="sm" withPadding>
                    {maintenance.monitors.map((comp, compIdx) => (
                      <List.Item key={compIdx}>{comp}</List.Item>
                    ))}
                  </List>
                </>
              )}
            </Alert>
          ))}
      </Container>
    </>
  )
}
