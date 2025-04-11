import { NextRequest } from "next/server"
import { getStatus } from "@/worker/src/monitor"
import { MonitorTarget } from "@/uptime.types"

export const runtime = 'edge'

// Check proxy if moved from Workers to Pages, https://github.com/lyc8503/UptimeFlare/issues/86#issuecomment-2655187257
export default async function handler(req: NextRequest): Promise<Response> {
  const target = await req.json<MonitorTarget>()
  const colo = req.headers.get("cf-ray")?.split("-")[1]
  console.log("Check proxy running at " + colo + ", Target: " + target)
  return new Response(
    JSON.stringify({
      location: colo,
      status: await getStatus(target),
    }),
    { headers: { "Content-Type": "application/json" } }
  )
}
