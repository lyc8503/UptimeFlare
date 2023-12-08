import { connect } from "cloudflare:sockets";
import { MonitorTarget } from "../../uptime.types";
import { withTimeout, fetchTimeout } from "./util";

export async function getStatus(
  monitor: MonitorTarget
): Promise<{ ping: number; up: boolean; err: string }> {
  let status = {
    ping: 0,
    up: false,
    err: 'Unknown',
  }

  const startTime = Date.now()

  if (monitor.method === 'TCP_PING') {
    // TCP port endpoint monitor
    try {
      const [hostname, port] = monitor.target.split(':')

      // Write "PING\n"
      const socket = connect({ hostname: hostname, port: Number(port) })
      const writer = socket.writable.getWriter()
      const reader = socket.readable.getReader()
      await writer.write(new TextEncoder().encode('PING\n'))
      await withTimeout(monitor.timeout || 10000, reader.read())
      await socket.close()

      // Not having an `opened` promise now...
      // https://github.com/cloudflare/workerd/issues/1305
      // await withTimeout(monitor.timeout || 10000, socket.closed)

      console.log(`${monitor.name} connected to ${monitor.target}`)

      status.ping = Date.now() - startTime
      status.up = true
      status.err = ''
    } catch (e: Error | any) {
      console.log(`${monitor.name} errored with ${e.name}: ${e.message}`)
      status.up = false
      status.err = e.name + ': ' + e.message
    }
  } else {
    // HTTP endpoint monitor
    try {
      const response = await fetchTimeout(monitor.target, monitor.timeout || 10000, {
        method: monitor.method,
        headers: monitor.headers as any,
        body: monitor.body,
        cf: {
          cacheTtlByStatus: {
            '100-599': -1, // Don't cache any status code, from https://developers.cloudflare.com/workers/runtime-apis/request/#requestinitcfproperties
          },
        },
      })

      console.log(`${monitor.name} responded with ${response.status}`)
      status.ping = Date.now() - startTime

      if (monitor.expectedCodes) {
        if (!monitor.expectedCodes.includes(response.status)) {
          status.up = false
          status.err = `Expected codes: ${JSON.stringify(monitor.expectedCodes)}, Got: ${
            response.status
          }`
          return status
        }
      } else {
        if (response.status < 200 || response.status > 299) {
          status.up = false
          status.err = `Expected codes: 2xx, Got: ${response.status}`
          return status
        }
      }

      if (monitor.responseKeyword) {
        const responseBody = await response.text()
        if (!responseBody.includes(monitor.responseKeyword)) {
          status.up = false
          status.err = "HTTP response doesn't contain the configured keyword"
          return status
        }
      }

      status.up = true
      status.err = ''
    } catch (e: any) {
      console.log(`${monitor.name} errored with ${e.name}: ${e.message}`)
      if (e.name === 'AbortError') {
        status.ping = monitor.timeout || 10000
        status.up = false
        status.err = `Timeout after ${status.ping}ms`
      } else {
        status.up = false
        status.err = e.name + ': ' + e.message
      }
    }
  }

  return status
}
