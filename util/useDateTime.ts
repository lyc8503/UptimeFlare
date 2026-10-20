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

// When a fixed time zone is configured and differs from the viewer's, returns e.g.
// { timeZone: 'Europe/Sofia', offset: 'UTC+3' }; otherwise null.
// Evaluated after mount, as the viewer's zone is unknown during server rendering.
export function useTimeZoneNotice() {
  const timeZone = pageConfig.dateTime?.timeZone
  const [notice, setNotice] = useState<{ timeZone: string; offset: string } | null>(null)

  useEffect(() => {
    if (!timeZone) return
    const now = new Date()
    const configuredOffset = getTimeZoneOffset(now, timeZone)
    if (configuredOffset !== getTimeZoneOffset(now)) {
      setNotice({ timeZone, offset: formatUtcOffset(configuredOffset) })
    }
  }, [timeZone])

  return notice
}
