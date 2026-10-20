// Configurable date/time formatting, shared by the status page and the worker.
// Built on Intl only (no dependencies), so any IANA time zone works in browsers and Workers.

export type DateTimeKind = 'dateTime' | 'date' | 'time'

export type DateTimeFormats = { [kind in DateTimeKind]?: string }

export type DateTimeConfig = {
  // IANA time zone, e.g. 'Europe/Sofia'. Unset: the viewer's local time zone
  timeZone?: string
  // moment-style patterns, e.g. 'MMM D, YYYY [at] h:mm:ss A'. Unset: legacy formatting
  formats?: DateTimeFormats
}

type FormatOptions = {
  timeZone?: string
  // Locale used for month/weekday names, AM/PM and zone names only. Default 'en-US'
  locale?: string
}

const TOKEN_REGEX = /\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|HH|H|hh|h|mm|m|ss|s|A|a|z/g

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = locale + JSON.stringify(options)
  let formatter = formatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    formatterCache.set(key, formatter)
  }
  return formatter
}

function getPart(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
  type: Intl.DateTimeFormatPartTypes
) {
  return getFormatter(locale, options)
    .formatToParts(date)
    .find((p) => p.type === type)?.value
}

// Numeric calendar fields of `date` as seen in `timeZone`
function getFields(date: Date, timeZone?: string) {
  const parts = getFormatter('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  }
}

const pad = (n: number, len = 2) => String(n).padStart(len, '0')

export function formatPattern(date: Date, pattern: string, options: FormatOptions = {}): string {
  const { timeZone } = options
  const locale = options.locale || 'en-US'
  const f = getFields(date, timeZone)
  const hour12 = f.hour % 12 || 12

  return pattern.replace(TOKEN_REGEX, (token, literal) => {
    if (literal !== undefined) return literal
    switch (token) {
      case 'YYYY':
        return String(f.year)
      case 'YY':
        return pad(f.year % 100)
      case 'MMMM':
        return getPart(date, locale, { timeZone, month: 'long' }, 'month') ?? pad(f.month)
      case 'MMM':
        return getPart(date, locale, { timeZone, month: 'short' }, 'month') ?? pad(f.month)
      case 'MM':
        return pad(f.month)
      case 'M':
        return String(f.month)
      case 'DD':
        return pad(f.day)
      case 'D':
        return String(f.day)
      case 'dddd':
        return getPart(date, locale, { timeZone, weekday: 'long' }, 'weekday') ?? ''
      case 'ddd':
        return getPart(date, locale, { timeZone, weekday: 'short' }, 'weekday') ?? ''
      case 'HH':
        return pad(f.hour)
      case 'H':
        return String(f.hour)
      case 'hh':
        return pad(hour12)
      case 'h':
        return String(hour12)
      case 'mm':
        return pad(f.minute)
      case 'm':
        return String(f.minute)
      case 'ss':
        return pad(f.second)
      case 's':
        return String(f.second)
      case 'A':
      case 'a': {
        const period =
          getPart(date, locale, { timeZone, hour: 'numeric', hour12: true }, 'dayPeriod') ??
          (f.hour < 12 ? 'AM' : 'PM')
        return token === 'a' ? period.toLowerCase() : period
      }
      case 'z':
        return getPart(date, locale, { timeZone, timeZoneName: 'short' }, 'timeZoneName') ?? ''
    }
    return token
  })
}

// Formatting used when no pattern is configured (the behaviour before patterns existed)
function legacyFormat(kind: DateTimeKind, date: Date, timeZone?: string) {
  switch (kind) {
    case 'dateTime':
      return date.toLocaleString(undefined, { timeZone })
    case 'date':
      return date.toLocaleDateString(undefined, { timeZone })
    case 'time':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone })
  }
}

export function formatDateTime(
  kind: DateTimeKind,
  date: Date | number | string,
  config: DateTimeConfig | undefined,
  locale?: string
): string {
  const d = date instanceof Date ? date : new Date(date)
  const pattern = config?.formats?.[kind]
  if (!pattern) return legacyFormat(kind, d, config?.timeZone)
  return formatPattern(d, pattern, { timeZone: config?.timeZone, locale })
}

// Offset of `timeZone` from UTC at `date`, in minutes (e.g. 180 for Europe/Sofia in summer)
export function getTimeZoneOffset(date: Date, timeZone?: string): number {
  const f = getFields(date, timeZone)
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second)
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000)
}

// e.g. "UTC+3", "UTC-9:30", "UTC"
export function formatUtcOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'UTC'
  const sign = offsetMinutes > 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const minutes = abs % 60
  return `UTC${sign}${Math.floor(abs / 60)}${minutes ? ':' + pad(minutes) : ''}`
}

// Unix timestamp (seconds) of the start of the day containing `timestamp`, in `timeZone`
export function startOfDay(timestamp: number, timeZone?: string): number {
  const f = getFields(new Date(timestamp * 1000), timeZone)
  const midnightAsUtc = Date.UTC(f.year, f.month - 1, f.day) / 1000
  // Correct by the zone's offset at that moment; re-check once for DST transitions
  let result = midnightAsUtc - getTimeZoneOffset(new Date(midnightAsUtc * 1000), timeZone) * 60
  result = midnightAsUtc - getTimeZoneOffset(new Date(result * 1000), timeZone) * 60
  return result
}

// "YYYY-MM" of `date` in `timeZone`
export function yearMonth(date: Date, timeZone?: string): string {
  const f = getFields(date, timeZone)
  return f.year + '-' + pad(f.month)
}
