const fetchTimeout = (url, ms, options = {}) => {
  const controller = new AbortController()
  const promise = fetch(url, { signal: controller.signal, ...options })
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort())
  }
  const timeout = setTimeout(() => controller.abort(), ms)
  return promise.finally(() => clearTimeout(timeout))
}

async function httpResponseBasicCheck(monitor, code, bodyReader) {
  if (monitor.expectedCodes) {
    if (!monitor.expectedCodes.includes(code)) {
      return `Expected codes: ${JSON.stringify(monitor.expectedCodes)}, Got: ${code}`
    }
  } else {
    if (code < 200 || code > 299) {
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

async function getStatusWithGlobalPing(monitor) {
  try {
    if (monitor.checkProxy === undefined) {
      throw "empty check proxy for globalping, shouldn't call this method"
    }

    const gpUrl = new URL(monitor.checkProxy)
    if (gpUrl.protocol !== 'globalping:') {
      throw 'incorrect check proxy protocol for globalping, got: ' + gpUrl.protocol
    }

    const token = gpUrl.hostname
    let globalPingRequest = {}

    if (monitor.method === 'TCP_PING') {
      const targetUrl = new URL('https://' + monitor.target) // dummy https:// to parse hostname & port
      globalPingRequest = {
        type: 'ping',
        target: targetUrl.hostname,
        locations: [
          {
            magic: gpUrl.searchParams.get('magic') || '',
          },
        ],
        measurementOptions: {
          port: targetUrl.port,
          packets: 1,
          protocol: 'tcp',
          ipVersion: Number(gpUrl.searchParams.get('ipVersion') || 4),
        },
      }
    } else {
      const targetUrl = new URL(monitor.target)
      if (monitor.body !== undefined) {
        throw 'custom body not supported'
      }
      if (monitor.method && !['GET', 'HEAD', 'OPTIONS'].includes(monitor.method.toUpperCase())) {
        throw 'only GET, HEAD, OPTIONS methods are supported'
      }
      globalPingRequest = {
        type: 'http',
        target: targetUrl.hostname,
        locations: [
          {
            magic: gpUrl.searchParams.get('magic') || '',
          },
        ],
        measurementOptions: {
          request: {
            method: monitor.method,
            path: targetUrl.pathname,
            query: targetUrl.search === '' ? undefined : targetUrl.search,
            headers: Object.fromEntries(
              Object.entries(monitor.headers ?? {}).map(([key, value]) => [key, String(value)])
            ), // TODO: headers
          },
          port:
            targetUrl.port === ''
              ? targetUrl.protocol === 'http:'
                ? 80
                : 443
              : Number(targetUrl.port),
          protocol: targetUrl.protocol.replace(':', ''),
          ipVersion: Number(gpUrl.searchParams.get('ipVersion') || 4),
        },
      }
    }

    const startTime = Date.now()
    console.log(`Requesting the Global Ping API, payload: ${JSON.stringify(globalPingRequest)}`)
    const measurement = await fetchTimeout('https://api.globalping.io/v1/measurements', 5000, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify(globalPingRequest),
    })
    const measurementResponse = await measurement.json()

    if (measurement.status !== 202) {
      throw measurementResponse.error.message
    }

    const measurementId = measurementResponse.id
    console.log(
      `Measurement created successfully, id: ${measurementId}, time elapsed: ${
        Date.now() - startTime
      }ms`
    )

    const pollStart = Date.now()
    let measurementResult
    while (true) {
      if (Date.now() - pollStart > (monitor.timeout ?? 10000) + 2000) {
        // 2s extra buffer
        throw 'api polling timeout'
      }

      measurementResult = await (
        await fetchTimeout(`https://api.globalping.io/v1/measurements/${measurementId}`, 5000)
      ).json()
      if (measurementResult.status !== 'in-progress') {
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    console.log(
      `Measurement ${measurementId} finished with response: ${JSON.stringify(
        measurementResult
      )}, time elapsed: ${Date.now() - pollStart}ms`
    )

    if (
      measurementResult.status !== 'finished' ||
      measurementResult.results[0].result.status !== 'finished'
    ) {
      console.log(
        `measurement failed with status: ${measurementResult.status}, result status: ${measurementResult.results[0].result.status}`
      )
      // Truncate raw output to avoid huge error messages
      throw `status [${measurementResult.status}|${
        measurementResult.results[0].result.status
      }]: ${measurementResult.results?.[0].result?.rawOutput?.slice(0, 64)}`
    }

    const country = measurementResult.results[0].probe.country

    if (monitor.method === 'TCP_PING') {
      const time = Math.round(measurementResult.results[0].result.stats.avg)
      return {
        location: country,
        status: {
          ping: time,
          up: true,
          err: '',
        },
      }
    } else {
      const time = measurementResult.results[0].result.timings.total
      const code = measurementResult.results[0].result.statusCode
      const body = measurementResult.results[0].result.rawBody

      let err = await httpResponseBasicCheck(monitor, code, () => body)
      if (err !== null) {
        console.log(`${monitor.name} didn't pass response check: ${err}`)
      }

      if (
        monitor.target.toLowerCase().startsWith('https') &&
        !measurementResult.results[0].result.tls.authorized
      ) {
        console.log(
          `${monitor.name} TLS certificate not trusted: ${measurementResult.results[0].result.tls.error}`
        )
        err = 'TLS certificate not trusted: ' + measurementResult.results[0].result.tls.error
      }

      return {
        location: country,
        status: {
          ping: time,
          up: err === null,
          err: err ?? '',
        },
      }
    }
  } catch (e) {
    console.log(`Globalping ${monitor.name} errored with ${e}`)
    // throw e
    return {
      location: 'ERROR',
      status: {
        ping: e.toString().toLowerCase().includes('timeout') ? monitor.timeout ?? 10000 : 0,
        up: false,
        err: 'Globalping error: ' + e.toString(),
      },
    }
  }
}

let ret = await getStatusWithGlobalPing({
  name: 'Test',
  method: 'GET',
  target: 'https://blog.lyc8503.net/',
  // headers: {
  //   "Hello": 1,
  //   "World": "test",
  // },
  checkProxy: 'globalping://2grt6l4wovwrwr4aytl3fovdcbjdem4k/?magic=Beijing',
  // timeout: 2000,
  // expectedCodes: [301],
  // responseForbiddenKeyword: 'cloudflare',
})

console.log(ret)
