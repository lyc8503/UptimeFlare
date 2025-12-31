import { Alert, List, Text, useMantineTheme } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconAlertTriangle } from '@tabler/icons-react'
import { MaintenanceConfig, MonitorTarget } from '@/types/config'
import { pageConfig } from '@/uptime.config'
import { useTranslation } from 'react-i18next'

export default function MaintenanceAlert({
  maintenance,
  style,
  upcoming = false,
}: {
  maintenance: Omit<MaintenanceConfig, 'monitors'> & { monitors?: (MonitorTarget | undefined)[] }
  style?: React.CSSProperties
  upcoming?: boolean
}) {
  const { t } = useTranslation('common')
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
          {(upcoming ? t('Upcoming') : '') + (maintenance.title || t('Scheduled Maintenance'))}
        </span>
      }
      color={
        upcoming ? pageConfig.maintenances?.upcomingColor ?? 'gray' : maintenance.color || 'yellow'
      }
      withCloseButton={false}
      style={{ margin: '16px auto 0 auto', ...style }}
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
            : { marginBottom: 4 }),
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gridColumnGap: '3px',
          }}
        >
          <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
            {upcoming ? t('Scheduled for') : t('From')}
          </div>
          <div>{new Date(maintenance.start).toLocaleString()}</div>
          <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
            {upcoming ? t('Expected end') : t('To')}
          </div>
          <div>
            {maintenance.end
              ? new Date(maintenance.end).toLocaleString()
              : t('Until further notice')}
          </div>
        </div>
      </div>

      <Text style={{ paddingTop: '3px', whiteSpace: 'pre-line' }}>{maintenance.body}</Text>
      {maintenance.monitors && maintenance.monitors.length > 0 && (
        <>
          <Text mt="xs">
            <b>{t('Affected components')}</b>
          </Text>
          <List size="sm" withPadding>
            {maintenance.monitors.map((comp, compIdx) => (
              <List.Item key={compIdx}>{comp?.name ?? t('MONITOR ID NOT FOUND')}</List.Item>
            ))}
          </List>
        </>
      )}
    </Alert>
  )
}
