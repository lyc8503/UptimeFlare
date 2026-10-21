export type MonitorBatch<T> = {
  monitors: T[]
  batchIndex: number
  batchCount: number
  batched: boolean
}

/**
 * Select a deterministic round-robin monitor batch for the default
 * every-minute Cron Trigger. Retries keep the same scheduled timestamp and
 * therefore select the same batch without a mutable cursor.
 */
export function selectMonitorBatch<T>(
  monitors: T[],
  configuredBatchSize: number | undefined,
  scheduledTime: number
): MonitorBatch<T> {
  if (
    configuredBatchSize === undefined ||
    !Number.isInteger(configuredBatchSize) ||
    configuredBatchSize <= 0 ||
    configuredBatchSize >= monitors.length
  ) {
    return {
      monitors,
      batchIndex: 0,
      batchCount: 1,
      batched: false,
    }
  }

  const batchSize = configuredBatchSize
  const batchCount = Math.ceil(monitors.length / batchSize)
  const scheduledMinute = Number.isFinite(scheduledTime)
    ? Math.floor(scheduledTime / 60_000)
    : 0
  const batchIndex = ((scheduledMinute % batchCount) + batchCount) % batchCount
  const start = batchIndex * batchSize

  return {
    monitors: monitors.slice(start, start + batchSize),
    batchIndex,
    batchCount,
    batched: true,
  }
}
