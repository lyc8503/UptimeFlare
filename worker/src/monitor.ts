import { MonitorTarget } from '../../types/config'
import { withTimeout, fetchTimeout } from './util'


async function httpResponseBasicCheck(monitor: MonitorTarget, code: number, bodyReader: () => Promise<string>): Promise<string | null> {
  if (monitor.expectedCodes) {
    if (!monitor.expectedCodes.includes(code)) {
      console.log(`${monitor.name} expected ${monitor.expectedCodes}, got ${code}`)
      return `Expected codes: ${JSON.stringify(monitor.expectedCodes)}, Got: ${code}`
    }
  } else {
    if (code < 200 || code > 299) {
      console.log(`${monitor.name} expected 2xx, got ${code}`)
      return `Expected codes: 2xx, Got: ${code}`
    }
  }

  if (monitor.responseKeyword || monitor.responseForbiddenKeyword) {
    // Only read response body if we have a keyword to check
    const responseBody = await bodyReader()

    // MUST contain responseKeyword
    if (monitor.responseKeyword && !responseBody.includes(monitor.responseKeyword)) {
      console.log(
        `${monitor.name} expected keyword ${
          monitor.responseKeyword
        }, not found in response (truncated to 100 chars): ${responseBody.slice(0, 100)}`
      )
      return "HTTP response doesn't contain the configured keyword"
    }

    // MUST NOT contain responseForbiddenKeyword
    if (
      monitor.responseForbiddenKeyword &&
      responseBody.includes(monitor.responseForbiddenKeyword)
    ) {
      console.log(
        `${monitor.name} forbidden keyword ${
          monitor.responseForbiddenKeyword
        }, found in response (truncated to 100 chars): ${responseBody.slice(0, 100)}`
      )
      return 'HTTP response contains the configured forbidden keyword'
    }
  }

  return null
}


export async function getStatusWithGlobalPing(monitor: MonitorTarget): Promise<{ location: string; status: { ping: number; up: boolean; err: string } }> {
  if (monitor.checkProxy === undefined) {
    throw 'empty check proxy for globalping, shouldn\'t call this method'
  }
  
  const gpUrl = new URL(monitor.checkProxy)
  if (gpUrl.protocol !== 'globalping:') {
    throw 'incorrect check proxy protocol for globalping, got: ' + gpUrl.protocol
  }

  const token = gpUrl.hostname
  let globalPingRequest = {}

  if (monitor.method === 'TCP_PING') {

  } else {
    const targetUrl = new URL(monitor.target)
    globalPingRequest = {
      type: 'http',
      target: targetUrl.hostname,
      measurementOptions: {
        request: {
          method: monitor.method,
          path: targetUrl.pathname,
          query: targetUrl.search,
          headers: monitor.headers
        },
        port: targetUrl.port
      }
    }
  }

  const startTime = Date.now()
  console.log(`Requesting the Global Ping API, payload: ${globalPingRequest}`)
  const measurement = await fetchTimeout('https://api.globalping.io/v1/measurements', 5000, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(globalPingRequest)
  })
  const measurementResponse = (await measurement.json() as any)

  if (measurement.status !== 202) {
    throw measurementResponse.error.message
  }

  const measurementId = measurementResponse.id
  console.log(`Measurement created successfully, id: ${measurementId}, time elapsed: ${Date.now() - startTime}ms`)

  const pollStart = Date.now()
  let measurementResult: any
  while (true) {
    if (Date.now() - pollStart > (monitor.timeout ?? 10000) + 2000) {
      throw 'api polling timeout'
    }

    measurementResult = await(await fetchTimeout(`https://api.globalping.io/v1/measurements/${measurementId}`, 5000)).json() as any
    if (measurementResult.status !== 'in-progress') {
      break
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log(`Measurement ${measurementId} finished with response: ${measurementResult}`)

  const time = measurementResult.results[0].result.timings.total
  const code = measurementResult.results[0].result.statusCode
  const body = measurementResult.results[0].result.rawBody

  const country = measurementResult.results[0].probe.country

  const err = await httpResponseBasicCheck(monitor, code, () => body)
  if (err !== null) {
    console.log(`${monitor.name} didn't pass response check: ${err}`)
  }
  // TODO: missing headers
  return {
    location: country,
    status: {  // TODO TLS err
      ping: time,
      up: err === null,
      err: err ?? ''
    }
  }
}


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
      const connect = await import(/* webpackIgnore: true */ 'cloudflare:sockets').then(
        (sockets) => sockets.connect
      )
      // This is not a real https connection, but we need to add a dummy `https://` to parse the hostname & port
      const parsed = new URL('https://' + monitor.target)
      const socket = connect({ hostname: parsed.hostname, port: Number(parsed.port) })

      // Now we have an `opened` promise!
      await withTimeout(monitor.timeout || 10000, socket.opened)
      await socket.close()

      console.log(`${monitor.name} connected to ${monitor.target}`)

      status.ping = Date.now() - startTime
      status.up = true
      status.err = ''
    } catch (e: Error | any) {
      console.log(`${monitor.name} errored with ${e.name}: ${e.message}`)
      if (e.message.includes('timed out')) {
        status.ping = monitor.timeout || 10000
      }
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

      const err = await httpResponseBasicCheck(monitor, response.status, response.text)
      if (err !== null) {
        console.log(`${monitor.name} didn't pass response check: ${err}`)
      }
      status.up = err === null
      status.err = err ?? ''
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
