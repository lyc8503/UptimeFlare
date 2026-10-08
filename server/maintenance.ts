import adminConfig from '../deploy/admin.json'
import type { MaintenanceConfig } from '../types/config'
import { monitorInMaintenance, type MaintenanceEvent } from '../util/maintenance'

type EventRow = {
  id: string
  title: string
  body: string
  monitors: string
  start_time: number
  end_time: number | null
  color: string
  created_at: number
  cancelled_at: number | null
}

function fromRow(row: EventRow): MaintenanceEvent {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    monitors: JSON.parse(row.monitors),
    start: row.start_time,
    ...(row.end_time === null ? {} : { end: row.end_time }),
    color: row.color,
    createdAt: row.created_at,
    ...(row.cancelled_at === null ? {} : { cancelledAt: row.cancelled_at }),
    source: 'dashboard',
  }
}

export async function listMaintenanceEvents(db: D1Database, includeHistory = false) {
  const now = Date.now()
  const result = includeHistory
    ? await db
        .prepare(
          `SELECT * FROM maintenance_events
        ORDER BY CASE WHEN cancelled_at IS NULL AND (end_time IS NULL OR end_time > ?) THEN 0 ELSE 1 END,
        start_time DESC LIMIT 200`
        )
        .bind(now)
        .all<EventRow>()
    : await db
        .prepare(
          `SELECT * FROM maintenance_events
        WHERE cancelled_at IS NULL AND (end_time IS NULL OR end_time > ?)
        ORDER BY start_time`
        )
        .bind(now)
        .all<EventRow>()
  return result.results.map(fromRow)
}

export async function allMaintenances(db: D1Database, configured: MaintenanceConfig[]) {
  if (!adminConfig.enabled) return configured
  return [...configured, ...(await listMaintenanceEvents(db))]
}

export class AdminInputError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message)
  }
}

export function validateEvent(
  input: Record<string, unknown>,
  monitorIds: string[],
  now = Date.now()
) {
  const { title, body, monitors, start, end, color } = input
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
    throw new AdminInputError('Enter a title of up to 120 characters.')
  }
  if (typeof body !== 'string' || !body.trim() || body.trim().length > 2000) {
    throw new AdminInputError('Enter a description of up to 2,000 characters.')
  }
  if (
    !Array.isArray(monitors) ||
    !monitors.length ||
    monitors.length > monitorIds.length ||
    monitors.some((id) => typeof id !== 'string' || !monitorIds.includes(id))
  ) {
    throw new AdminInputError('Choose at least one valid monitor.')
  }
  const startTime = start === 'now' ? now : typeof start === 'number' ? start : NaN
  const endTime = end === null ? null : typeof end === 'number' ? end : NaN
  const maxDate = now + 366 * 24 * 60 * 60 * 1000
  if (!Number.isSafeInteger(startTime) || startTime < now - 60_000 || startTime > maxDate) {
    throw new AdminInputError('Choose a start time from now to one year ahead.')
  }
  if (
    endTime !== null &&
    (!Number.isSafeInteger(endTime) || endTime <= startTime || endTime <= now || endTime > maxDate)
  ) {
    throw new AdminInputError('The end must be after the start and within one year.')
  }
  if (
    typeof color !== 'string' ||
    !['blue', 'yellow', 'orange', 'red', 'grape', 'gray'].includes(color)
  ) {
    throw new AdminInputError('Choose a valid event color.')
  }
  return {
    title: title.trim(),
    body: body.trim(),
    monitors: Array.from(new Set<string>(monitors)),
    startTime,
    endTime,
    color,
  }
}

export async function createMaintenanceEvent(
  db: D1Database,
  input: Record<string, unknown>,
  monitors: { id: string; name: string }[],
  configured: MaintenanceConfig[]
) {
  const now = Date.now()
  const quick = input.preset === 'maintenance'
  if (input.preset !== undefined && !quick) throw new AdminInputError('Choose a valid preset.')
  if (quick) {
    if (![0, 15, 30, 60, 120].includes(input.minutes as number)) {
      throw new AdminInputError('Choose a valid maintenance duration.')
    }
    const monitor = monitors.find(({ id }) => id === input.monitorId)
    if (!monitor) throw new AdminInputError('Choose a valid monitor.')
    if (monitorInMaintenance(configured, monitor.id, now)) {
      throw new AdminInputError(
        'This service already has an active event in the configuration.',
        409
      )
    }
    input = {
      title: `${monitor.name} maintenance`.slice(0, 120),
      body: 'This service may be temporarily unavailable while maintenance is in progress.',
      monitors: [monitor.id],
      start: 'now',
      end: input.minutes === 0 ? null : now + Number(input.minutes) * 60_000,
      color: 'blue',
    }
  }
  const event = validateEvent(
    input,
    monitors.map(({ id }) => id),
    now
  )
  const id = crypto.randomUUID()
  // A single statement prevents concurrent quick-start requests from creating duplicates.
  const result = await db
    .prepare(
      `INSERT INTO maintenance_events
      (id, title, body, monitors, start_time, end_time, color, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?
      WHERE ? = 0 OR NOT EXISTS (
        SELECT 1 FROM maintenance_events
        WHERE cancelled_at IS NULL AND start_time <= ? AND (end_time IS NULL OR end_time > ?)
          AND (json_array_length(monitors) = 0 OR EXISTS (SELECT 1 FROM json_each(monitors) WHERE value = ?))
      ) RETURNING *`
    )
    .bind(
      id,
      event.title,
      event.body,
      JSON.stringify(event.monitors),
      event.startTime,
      event.endTime,
      event.color,
      now,
      quick ? 1 : 0,
      now,
      now,
      event.monitors[0]
    )
    .first<EventRow>()
  if (!result)
    throw new AdminInputError(
      'This service is already in maintenance. Refresh to manage its active event.',
      409
    )
  return fromRow(result)
}

export async function updateMaintenanceEvent(db: D1Database, input: Record<string, unknown>) {
  const { id, action } = input
  if (typeof id !== 'string' || id.length > 100) throw new AdminInputError('Choose a valid event.')
  const now = Date.now()
  let statement: D1PreparedStatement
  if (action === 'end') {
    statement = db
      .prepare(
        `UPDATE maintenance_events SET end_time = ?
      WHERE id = ? AND cancelled_at IS NULL AND start_time <= ? AND (end_time IS NULL OR end_time > ?) RETURNING *`
      )
      .bind(now, id, now, now)
  } else if (action === 'cancel') {
    statement = db
      .prepare(
        `UPDATE maintenance_events SET cancelled_at = ?
      WHERE id = ? AND cancelled_at IS NULL AND start_time > ? RETURNING *`
      )
      .bind(now, id, now)
  } else if (action === 'extend') {
    if (input.minutes !== 30) throw new AdminInputError('Extensions add 30 minutes.')
    statement = db
      .prepare(
        `UPDATE maintenance_events SET end_time = end_time + 1800000
      WHERE id = ? AND cancelled_at IS NULL AND start_time <= ? AND end_time > ? RETURNING *`
      )
      .bind(id, now, now)
  } else {
    throw new AdminInputError('Choose end, cancel, or extend.')
  }
  const result = await statement.first<EventRow>()
  if (!result)
    throw new AdminInputError(
      'This event has changed or cannot use that action. Refresh and try again.',
      409
    )
  return fromRow(result)
}
