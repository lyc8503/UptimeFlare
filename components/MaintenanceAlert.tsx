import { Alert, List, Text, useMantineTheme } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconAlertTriangle } from '@tabler/icons-react'
import { MaintenanceConfig, MonitorTarget } from '@/types/config'

export default function MaintenanceAlert({
  maintenance,
  style,
}: {
  maintenance: Omit<MaintenanceConfig, 'monitors'> & { monitors?: MonitorTarget[] }
  style?: React.CSSProperties
}) {
  const theme = useMantineTheme()
  const isDesktop = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`)

  return (
    <Alert
      icon={<IconAlertTriangle />}
      title={
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 700,
          }}
        >
          {maintenance.title || 'Scheduled Maintenance'}
        </span>
      }
      color={maintenance.color || 'yellow'}
      withCloseButton={false}
      style={{ position: 'relative', margin: '16px auto 0 auto', ...style }}
    >
      {/* Date range in top right (desktop) or inline (mobile) */}
      <div
        style={{
          ...{
            top: 10,
            fontSize: '0.85rem',
            borderRadius: 6,
          },
          ...(isDesktop
            ? {
                position: 'absolute',
                right: 10,
                padding: '2px 8px',
                textAlign: 'right',
              }
            : {}),
        }}
      >
        <b>From:</b> {new Date(maintenance.start).toLocaleString()}
        <br />
        <b>To:</b>{' '}
        {maintenance.end ? new Date(maintenance.end).toLocaleString() : 'Until further notice'}
      </div>

      <Text style={{ paddingTop: '3px' }}>{maintenance.body}</Text>
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
