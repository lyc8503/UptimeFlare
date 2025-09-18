import { Alert, List, Text } from '@mantine/core'
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
      style={{ position: 'relative', margin: '16px auto 0 auto', ...style }}
    >
      {/* Date range in top right */}
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
        {upcoming ? (
          <>
            <b>Scheduled for:</b> {new Date(maintenance.start).toLocaleString()}
            <br />
            <b>Expected end:</b>{' '}
            {maintenance.end ? new Date(maintenance.end).toLocaleString() : 'Until further notice'}
          </>
        ) : (
          <>
            <b>From:</b> {new Date(maintenance.start).toLocaleString()}
            <br />
            <b>To:</b>{' '}
            {maintenance.end ? new Date(maintenance.end).toLocaleString() : 'Until further notice'}
          </>
        )}
      </div>

      {/* Maintenance description */}
      <Text style={{ whiteSpace: 'pre-line' }}>{maintenance.body}</Text>

      {/* Affected components */}
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
