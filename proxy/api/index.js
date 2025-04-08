// This is a Node.js implementation of status monitoring

const location = ''

const express = require('express')
const net = require('net')
const app = express()
const port = 3000

async function getWorkerLocation() {
  const res = await fetch('https://cloudflare.com/cdn-cgi/trace')
  const text = await res.text()

  const colo = /^colo=(.*)$/m.exec(text)?.[1]
  return colo
}

const fetchTimeout = (url, ms, options = {}) => {
  const controller = new AbortController()
  const promise = fetch(url, { signal: controller.signal, ...options })
  const timeout = setTimeout(() => controller.abort(), ms)
  return promise.finally(() => clearTimeout(timeout))
}

function withTimeout(millis, promise) {
  const timeout = new Promise((resolve, reject) =>
    setTimeout(() => reject(new Error(`Promise timed out after ${millis}ms`)), millis)
  )

  return Promise.race([promise, timeout])
}


// TODO: More code reuse here
async function getStatus(monitor) {
  let status = {
    ping: 0,
    up: false,
    err: 'Unknown',
  }

  const startTime = Date.now()

  if (monitor.method === 'TCP_PING') {
    // TCP port endpoint monitor
    try {
      // This is not a real https connection, but we need to add a dummy `https://` to parse the hostname & port
      const parsed = new URL("https://" + monitor.target)

      const client = await net.createConnection(
        { host: parsed.hostname, port: Number(parsed.port) },
        () => {
          console.log(`${monitor.name} connected to ${monitor.target}`)
          status.ping = Date.now() - startTime
          status.up = true
          status.err = ''
          client.end()
        }
      )

      // const socket = connect({ hostname: parsed.hostname, port: Number(parsed.port) })

      // // Now we have an `opened` promise!
      // // @ts-ignore
      // await withTimeout(monitor.timeout || 10000, socket.opened)
      // await socket.close()

      
    } catch (e) {
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
        headers: monitor.headers,
        body: monitor.body,
      })

      console.log(`${monitor.name} responded with ${response.status}`)
      status.ping = Date.now() - startTime

      if (monitor.expectedCodes) {
        if (!monitor.expectedCodes.includes(response.status)) {
          console.log(`${monitor.name} expected ${monitor.expectedCodes}, got ${response.status}`)
          status.up = false
          status.err = `Expected codes: ${JSON.stringify(monitor.expectedCodes)}, Got: ${response.status
            }`
          return status
        }
      } else {
        if (response.status < 200 || response.status > 299) {
          console.log(`${monitor.name} expected 2xx, got ${response.status}`)
          status.up = false
          status.err = `Expected codes: 2xx, Got: ${response.status}`
          return status
        }
      }

      if (monitor.responseKeyword || monitor.responseForbiddenKeyword) {
        // Only read response body if we have a keyword to check
        const responseBody = await response.text()

        // MUST contain responseKeyword
        if (monitor.responseKeyword && !responseBody.includes(monitor.responseKeyword)) {
          console.log(`${monitor.name} expected keyword ${monitor.responseKeyword}, not found in response (truncated to 100 chars): ${responseBody.slice(0, 100)}`)
          status.up = false
          status.err = "HTTP response doesn't contain the configured keyword"
          return status
        }

        // MUST NOT contain responseForbiddenKeyword
        if (monitor.responseForbiddenKeyword && responseBody.includes(monitor.responseForbiddenKeyword)) {
          console.log(`${monitor.name} forbidden keyword ${monitor.responseForbiddenKeyword}, found in response (truncated to 100 chars): ${responseBody.slice(0, 100)}`)
          status.up = false
          status.err = "HTTP response contains the configured forbidden keyword"
          return status
        }
      }

      status.up = true
      status.err = ''
    } catch (e) {
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

app.use(express.json());

app.post('/', (req, res) => {
  res.json(
    {
      location: getWorkerLocation(),
      status: getStatus(req.body),
    }
  )
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

module.exports = app;
