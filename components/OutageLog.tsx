import { MonitorTarget } from '@/types/config'
import { CompactedMonitorStateWrapper } from '@/worker/src/store'
import { Badge, Box, Table, Text, Title } from '@mantine/core'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const moment = require('moment')
require('moment-precise-range-plugin')

type Outage = {
  monitor: MonitorTarget
  start: number
  end: number | null
  reasons: string[]
}

// Lists the incidents recorded by the worker (the same data as the uptime bars) for one month, newest first
export default function OutageLog({
  compactedStateStr,
  monitors,
  month,
  monitorId,
}: {
  compactedStateStr: string
  monitors: MonitorTarget[]
  month: string
  monitorId: string | null
}) {
  const { t } = useTranslation('common')

  const outages = useMemo(() => {
    const state = new CompactedMonitorStateWrapper(compactedStateStr)
    const result: Outage[] = []
    for (const monitor of monitors) {
      for (let i = 0; i < state.incidentLen(monitor.id); i++) {
        const incident = state.getIncident(monitor.id, i)
        // The first incident of a monitor is a placeholder marking the start of the monitoring
        if (incident.error[0] === 'dummy') continue
        result.push({
          monitor,
          start: incident.start[0],
          end: incident.end,
          reasons: incident.error.filter((e, index) => incident.error.indexOf(e) === index),
        })
      }
    }
    return result.sort((a, b) => b.start - a.start)
  }, [compactedStateStr, monitors])

  const filtered = outages.filter((outage) => {
    const d = new Date(outage.start * 1000)
    const outageMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    return outageMonth === month && (!monitorId || outage.monitor.id === monitorId)
  })

  const currentTime = Math.round(Date.now() / 1000)
  const duration = (seconds: number) =>
    moment.preciseDiff(moment(0), moment(Math.max(seconds, 60) * 1000))

  return (
    <Box mt="xl">
      <Title order={4} mb="sm">
        {t('Outages')}
      </Title>
      {filtered.length === 0 ? (
        <Text c="dimmed">{t('No outages in this month')}</Text>
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <Table striped verticalSpacing="xs" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('Monitor')}</Table.Th>
                <Table.Th>{t('Started')}</Table.Th>
                <Table.Th>{t('Duration')}</Table.Th>
                <Table.Th>{t('Reason')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((outage) => (
                <Table.Tr key={outage.monitor.id + '-' + outage.start}>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>{outage.monitor.name}</Table.Td>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(outage.start * 1000).toLocaleString()}
                  </Table.Td>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>
                    {outage.end === null ? (
                      <Badge color="red" variant="light">
                        {t('Ongoing')} · {duration(currentTime - outage.start)}
                      </Badge>
                    ) : (
                      duration(outage.end - outage.start)
                    )}
                  </Table.Td>
                  <Table.Td style={{ wordBreak: 'break-word' }}>{outage.reasons.join(' → ')}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      )}
    </Box>
  )
}
