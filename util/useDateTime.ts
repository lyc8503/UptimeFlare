import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { pageConfig } from '@/uptime.config'
import {
  DateTimeKind,
  formatDateTime,
  formatUtcOffset,
  getTimeZoneOffset,
  startOfDay,
  yearMonth,
} from './datetime'

// Date/time helpers for page components, applying `pageConfig.dateTime`
export function useDateTime() {
  const { i18n } = useTranslation('common')
  const config = pageConfig.dateTime
  const timeZone = config?.timeZone
  const locale = i18n.resolvedLanguage || 'en'

  return {
    timeZone,
    format: (kind: DateTimeKind, date: Date | number | string) =>
      formatDateTime(kind, date, config, locale),
    startOfDay: (timestamp: number) => startOfDay(timestamp, timeZone),
    yearMonth: (date: Date) => yearMonth(date, timeZone),
  }
}

// Which time zone the page's times are shown in, relative to the viewer's own:
// - 'local': no fixed zone configured, times are in the viewer's local zone
// - 'fixed-same': fixed zone configured, same offset as the viewer's local zone
// - 'fixed-other': fixed zone configured, different from the viewer's local zone
// Evaluated after mount (null until then), as the viewer's zone is unknown during server rendering.
export type TimeZoneNotice = {
  kind: 'local' | 'fixed-same' | 'fixed-other'
  timeZone: string
  offset: string
}

export function useTimeZoneNotice() {
  const timeZone = pageConfig.dateTime?.timeZone
  const [notice, setNotice] = useState<TimeZoneNotice | null>(null)

  useEffect(() => {
    const now = new Date()
    const localOffset = getTimeZoneOffset(now)
    if (!timeZone) {
      setNotice({
        kind: 'local',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: formatUtcOffset(localOffset),
      })
      return
    }
    const configuredOffset = getTimeZoneOffset(now, timeZone)
    setNotice({
      kind: configuredOffset === localOffset ? 'fixed-same' : 'fixed-other',
      timeZone,
      offset: formatUtcOffset(configuredOffset),
    })
  }, [timeZone])

  return notice
}
