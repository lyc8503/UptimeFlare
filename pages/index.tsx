import Head from 'next/head'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

import { MonitorState } from '@/uptime.types'
import { KVNamespace } from '@cloudflare/workers-types'
import config from '@/uptime.config'

export const runtime = 'experimental-edge'

export default function Home({ state }: { state: MonitorState }) {
  
  
  // Calculate overall status
  // TODO: Move this to a component
  let downCount = 0
  let upCount = 0

  for (const monitor of config.monitors) {
    if (state.history[monitor.id]?.slice(-1)[0].up) {
      upCount += 1
    } else {
      downCount += 1
    }
  }

  let overallStatus = ""
  
  if (downCount === 0 && upCount === 0) {
    overallStatus = "No monitors configured"
  }
  if (downCount === 0) {
    overallStatus = "All systems operational"
  }
  if (upCount === 0) {
    overallStatus = "All systems not operational"
  }
  if (upCount > 0 && downCount > 0) {
    overallStatus = "Some systems not operational"
  }


  return (
    <>
      <Head>
        <title>{config.page.title}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Uptime Flare</h1>

        <h2>Current Status: {overallStatus}</h2>
        <h2>Last updated on: {state.lastUpdate.toString()}</h2>

        {
          config.monitors.map(monitor => (
            <div key={monitor.id}>
              <h2>{monitor.name}</h2>
            </div>
          ))
        }
        <p>{JSON.stringify(state)}</p>
      </main>
    </>
  )
}


export async function getServerSideProps() {
  const { UPTIMEFLARE_STATE } = process.env as unknown as { UPTIMEFLARE_STATE: KVNamespace }
  const state = await UPTIMEFLARE_STATE.get('state', 'json') as unknown as MonitorState

  return { props: { state } }
}
