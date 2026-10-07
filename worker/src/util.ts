import { MonitorTarget, WebhookConfig } from '../../types/config'
import { maintenances, workerConfig } from '../../uptime.config'
import { allWebhookDeliveriesSucceeded } from './notification'

async function getWorkerLocation() {
  const res = await fetch('https://cloudflare.com/cdn-cgi/trace')
  const text = await res.text()

  const colo = /^colo=(.*)$/m.exec(text)?.[1]
  return colo
}

const fetchTimeout = (
  url: string,
  ms: number,
  { signal, ...options }: RequestInit<RequestInitCfProperties> | undefined = {}
): Promise<Response> => {
  const controller = new AbortController()
  const promise = fetch(url, { signal: controller.signal, ...options })
  if (signal) signal.addEventListener('abort', () => controller.abort())
  const timeout = setTimeout(() => controller.abort(), ms)
  return promise.finally(() => clearTimeout(timeout))
}

function withTimeout<T>(millis: number, promise: Promise<T>): Promise<T> {
  const timeout = new Promise<T>((resolve, reject) =>
    setTimeout(() => reject(new Error(`Promise timed out after ${millis}ms`)), millis)
  )

  return Promise.race([promise, timeout])
}

function formatStatusChangeNotification(
  monitor: any,
  isUp: boolean,
  timeIncidentStart: number,
  timeNow: number,
  reason: string,
  timeZone: string
) {
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timeZone,
  })

  let downtimeDuration = Math.round((timeNow - timeIncidentStart) / 60)
  const timeNowFormatted = dateFormatter.format(new Date(timeNow * 1000))
  const timeIncidentStartFormatted = dateFormatter.format(new Date(timeIncidentStart * 1000))

  if (isUp) {
    return `✅ ${monitor.name} is up! \nThe service is up again after being down for ${downtimeDuration} minutes.`
  } else if (timeNow == timeIncidentStart) {
    return `🔴 ${
      monitor.name
    } is currently down. \nService is unavailable at ${timeNowFormatted}. \nIssue: ${
      reason || 'unspecified'
    }`
  } else {
    return `🔴 ${
      monitor.name
    } is still down. \nService is unavailable since ${timeIncidentStartFormatted} (${downtimeDuration} minutes). \nIssue: ${
      reason || 'unspecified'
    }`
  }
}

function templateWebhookPlayload(payload: any, message: string) {
  for (const key in payload) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      if (payload[key] === '$MSG') {
        payload[key] = message
      } else if (typeof payload[key] === 'object' && payload[key] !== null) {
        templateWebhookPlayload(payload[key], message)
      }
    }
  }
}

async function webhookNotify(webhook: WebhookConfig, message: string): Promise<boolean> {
  if (Array.isArray(webhook)) {
    const results: boolean[] = []
    for (const w of webhook) {
      results.push(await webhookNotify(w, message))
    }
    return allWebhookDeliveriesSucceeded(results)
  }

  console.log(
    'Sending webhook notification: ' + JSON.stringify(message) + ' to webhook ' + webhook.url
  )
  try {
    let url = webhook.url
    let method = webhook.method
    let headers = new Headers(webhook.headers as any)
    let payloadTemplated: { [key: string]: string | number } = JSON.parse(
      JSON.stringify(webhook.payload)
    )
    templateWebhookPlayload(payloadTemplated, message)
    let body = undefined

    switch (webhook.payloadType) {
      case 'param':
        method = method ?? 'GET'
        const urlTmp = new URL(url)
        for (const [k, v] of Object.entries(payloadTemplated)) {
          urlTmp.searchParams.append(k, v.toString())
        }
        url = urlTmp.toString()
        break
      case 'json':
        method = method ?? 'POST'
        if (headers.get('content-type') === null) {
          headers.set('content-type', 'application/json')
        }
        body = JSON.stringify(payloadTemplated)
        break
      case 'x-www-form-urlencoded':
        method = method ?? 'POST'
        if (headers.get('content-type') === null) {
          headers.set('content-type', 'application/x-www-form-urlencoded')
        }
        body = new URLSearchParams(payloadTemplated as any).toString()
        break
      default:
        throw 'Unrecognized payload type: ' + webhook.payloadType
    }

    console.log(
      `Webhook finalized parameters: ${method} ${url}, headers ${JSON.stringify(
        Object.fromEntries(headers.entries())
      )}, body ${JSON.stringify(body)}`
    )
    const resp = await fetchTimeout(url, webhook.timeout ?? 5000, { method, headers, body })

    if (!resp.ok) {
      console.log(
        'Error calling webhook server, code: ' + resp.status + ', response: ' + (await resp.text())
      )
      return false
    }

    console.log('Webhook notification sent successfully, code: ' + resp.status)
    return true
  } catch (e) {
    console.log('Error calling webhook server: ' + e)
    return false
  }
}

// Auxiliary function to format notification and send it via webhook
const formatAndNotify = async (
  monitor: MonitorTarget,
  isUp: boolean,
  timeIncidentStart: number,
  timeNow: number,
  reason: string
): Promise<boolean> => {
  // Skip notification if monitor is in the skip list
  const skipList = workerConfig.notification?.skipNotificationIds
  if (skipList && skipList.includes(monitor.id)) {
    console.log(`Skipping notification for ${monitor.name} (${monitor.id} in skipNotificationIds)`)
    return false
  }

  // Skip notification if monitor is currently in maintenance. Keep timeNow for
  // the notification's event timestamp, but do not let a historical recovery
  // timestamp make retries remain in an already-finished maintenance window.
  const maintenanceNow = new Date()
  const maintenanceList = maintenances
    .filter(
      (m) =>
        maintenanceNow >= new Date(m.start) &&
        (!m.end || maintenanceNow <= new Date(m.end))
    )
    .map((e) => e.monitors || [])
    .flat()

  if (maintenanceList.includes(monitor.id)) {
    console.log(`Skipping notification for ${monitor.name} (in maintenance)`)
    return false
  }

  if (workerConfig.notification?.webhook) {
    const notification = formatStatusChangeNotification(
      monitor,
      isUp,
      timeIncidentStart,
      timeNow,
      reason,
      workerConfig.notification?.timeZone ?? 'Etc/GMT'
    )
    return webhookNotify(workerConfig.notification.webhook, notification)
  } else {
    console.log(`Webhook not set, skipping notification for ${monitor.name}`)
    return false
  }
}

export {
  getWorkerLocation,
  fetchTimeout,
  withTimeout,
  webhookNotify,
  formatStatusChangeNotification,
  formatAndNotify,
}
