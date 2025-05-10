import { Card, Text, Grid, Flex, Badge } from '@mantine/core'
import { formatDistance } from 'date-fns'

export default function IncidentList({
  incidents,
}: {
  incidents: { start: number[]; end: number | undefined; error: string[] }[]
}) {
  if (!incidents || incidents.length === 0) {
    return <Text mt="md">No historical incidents found.</Text>
  }

  return (
    <Grid mt="md">
      {[...incidents].reverse().map((incident, index) => (
        <Grid.Col key={index} span={12}>
          <Card withBorder padding="md">
            <Flex justify="space-between">
              <div>
                <Text fw={700}>{incident.error[0]}</Text>
              </div>

              <div>
                <Badge color={incident.end ? 'gray' : 'red'} variant="outline">
                  {incident.end ? 'Resolved' : 'Ongoing'}
                </Badge>
              </div>
            </Flex>

            <Flex gap="md" mt="sm">
              <div>
                <Text size="sm" c="dimmed">
                  Start:{' '}
                  {formatDistance(new Date(incident.start[0] * 1000), new Date(), {
                    addSuffix: true,
                  })}
                </Text>
              </div>

              {incident.end && (
                <div>
                  <Text size="sm" c="dimmed">
                    Duration:{' '}
                    {formatDistance(
                      new Date(incident.start[0] * 1000),
                      new Date(incident.end * 1000)
                    )}
                  </Text>
                </div>
              )}
            </Flex>
          </Card>
        </Grid.Col>
      ))}
    </Grid>
  )
}
