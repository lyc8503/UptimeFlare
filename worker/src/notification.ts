export type DownNotificationDecision = {
  currentTime: number
  incidentStart: number
  notifiedIncidentStart: number | undefined
  gracePeriodMinutes: number | undefined
  monitorStatusChanged: boolean
  skipErrorChangeNotification: boolean | undefined
}

export function allWebhookDeliveriesSucceeded(results: boolean[]): boolean {
  return results.length > 0 && results.every(Boolean)
}

export function shouldSendDownNotification({
  currentTime,
  incidentStart,
  notifiedIncidentStart,
  gracePeriodMinutes,
  monitorStatusChanged,
  skipErrorChangeNotification,
}: DownNotificationDecision): boolean {
  const isFollowupErrorChange = monitorStatusChanged && incidentStart !== currentTime
  if (notifiedIncidentStart === incidentStart) {
    return isFollowupErrorChange && !skipErrorChangeNotification
  }

  const gracePeriodSeconds = (gracePeriodMinutes ?? 0) * 60
  if (currentTime - incidentStart < gracePeriodSeconds) return false

  if (isFollowupErrorChange && skipErrorChangeNotification) return false

  return true
}
