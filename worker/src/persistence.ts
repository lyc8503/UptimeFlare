export type PersistenceDecision = {
  batched: boolean
  statusChanged: boolean
  notificationStateChanged: boolean
  currentTime: number
  lastUpdate: number
  cooldownMinutes: number | undefined
}

export function shouldPersistState({
  batched,
  statusChanged,
  notificationStateChanged,
  currentTime,
  lastUpdate,
  cooldownMinutes,
}: PersistenceDecision): boolean {
  return (
    batched ||
    statusChanged ||
    notificationStateChanged ||
    currentTime - lastUpdate >= (cooldownMinutes ?? 3) * 60 - 10
  )
}
