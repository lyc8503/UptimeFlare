import { workerConfig } from '@/uptime.config'
import { NextRequest } from 'next/server'
import { getLastPush, setLastPush } from '@/worker/src/store'

export const runtime = 'edge'

// A heartbeat arriving within this many seconds of the recorded one is accepted without another D1 write
const WRITE_COOLDOWN_SECONDS = 30

const headers = {
  'Content-Type': 'text/plain',
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Heartbeat endpoint for `PUSH` monitors: /api/push/<monitor id>/<pushToken>
export default async function handler(req: NextRequest): Promise<Response> {
  if (!['GET', 'POST', 'HEAD'].includes(req.method)) {
    return new Response('Method not allowed\n', { status: 405, headers })
  }

  // An unknown monitor and a wrong token get the same answer
  const notFound = () => new Response('Not found\n', { status: 404, headers })

  const match = /\/api\/push\/([^/]+)\/([^/]+)$/.exec(new URL(req.url).pathname)
  if (match === null) return notFound()

  let id: string, token: string
  try {
    id = decodeURIComponent(match[1])
    token = decodeURIComponent(match[2])
  } catch (e) {
    return notFound()
  }

  const monitor = workerConfig.monitors.find((m) => m.id === id && m.method === 'PUSH')
  if (!monitor || !monitor.pushToken || !timingSafeEqual(monitor.pushToken, token)) {
    return notFound()
  }

  const currentTimeSecond = Math.round(Date.now() / 1000)
  const lastPush = await getLastPush(process.env as any, monitor.id)
  if (lastPush === null || currentTimeSecond - lastPush >= WRITE_COOLDOWN_SECONDS) {
    await setLastPush(process.env as any, monitor.id, currentTimeSecond)
  }

  return new Response('OK\n', { headers })
}
