import { Alert, List, Text } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { Maintenances, Monitor } from '@/types/config'
import { pageConfig } from '@/uptime.config'

export default function MaintenanceAlert({
  maintenance,
  groupedMonitor,
}: {
  maintenance: Omit<Maintenances, 'monitors'> & { monitors: Monitor[] | undefined }
  groupedMonitor: boolean
}) {
  return (
    <Alert
      icon={<IconAlertTriangle />}
      title={maintenance.title}
      color={maintenance.color || 'primary'}
      mt="md"
      ml="md"
      mr="md"
      withCloseButton={false}
      style={{ maxWidth: groupedMonitor ? '897px' : '865px', position: 'relative' }}
    >
      {/* Date range in top right */}
      {(maintenance.start || maintenance.end) && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontSize: '0.85rem',
            textAlign: 'right',
            padding: '2px 8px',
            borderRadius: 6,
          }}
        >
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
        </div>
      )}

      {maintenance.body && <Text mt="xs">{maintenance.body}</Text>}
      {maintenance.monitors && maintenance.monitors.length > 0 && (
        <>
          <Text mt="xs">
            <b>Affected components:</b>
          </Text>
          <List size="sm" withPadding>
            {maintenance.monitors.map((comp, compIdx) => (
              <List.Item key={compIdx}>{comp.name}</List.Item>
            ))}
          </List>
        </>
      )}
    </Alert>
  )
}
