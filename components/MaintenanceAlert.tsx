import { Alert, List, Text, Group, Box } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { MaintenanceConfig, MonitorTarget } from '@/types/config'

export default function MaintenanceAlert({
  maintenance,
  style,
  upcoming = false,
}: {
  maintenance: Omit<MaintenanceConfig, 'monitors'> & { monitors?: MonitorTarget[] }
  style?: React.CSSProperties
  upcoming?: boolean
}) {
  return (
    <Alert
      icon={<IconAlertTriangle />}
      title={
        upcoming
          ? `Upcoming Maintenance: ${maintenance.title || 'Scheduled Maintenance'}`
          : maintenance.title || 'Scheduled Maintenance'
      }
      color={upcoming ? 'gray' : maintenance.color || '#f29030'}
      withCloseButton={false}
      style={{ margin: '16px auto', ...style }}
    >
      {/* Body and dates in a responsive flex layout */}
      <Group
        align="flex-start"
        style={{
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: 16,
          [`@media (max-width: 600px)`]: { gap: 8 },
        }}
      >
      {/* Maintenance description and affected components */}
        <Box style={{ flex: '1 1 300px', minWidth: 200 }}>
          <Text style={{ whiteSpace: 'pre-line' }}>{maintenance.body}</Text>

          {maintenance.monitors && maintenance.monitors.length > 0 && (
            <>
              <Text mt="xs"><b>Affected components:</b></Text>
              <List size="sm" withPadding>
                {maintenance.monitors.map((comp, idx) => (
                  <List.Item key={idx}>{comp.name}</List.Item>
                ))}
              </List>
            </>
          )}
        </Box>

        {/* Date range */}
        <Box
          style={{
            flex: '0 0 auto',
            fontSize: '0.85rem',
            textAlign: 'right',
            minWidth: 120,
          }}
        >
          
              <b>{upcoming ? 'Scheduled for' : 'From'}:</b> {new Date(maintenance.start).toLocaleString()}
              <br />
              <b>{upcoming ? 'Expected end' : 'To'}:</b>{' '}
              {maintenance.end
                ? new Date(maintenance.end).toLocaleString()
                : 'Until further notice'}
        </Box>
      </Group>
    </Alert>
  )
}
