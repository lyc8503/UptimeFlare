import Head from 'next/head'

import { Inter } from 'next/font/google'
import { MonitorState } from '@/uptime.types'
import { KVNamespace } from '@cloudflare/workers-types'
import config from '@/uptime.config'
import OverallStatus from '@/components/OverallStatus'
import Header from '@/components/Header'
import MonitorList from '@/components/MonitorList'
import { Center, Divider, Text } from '@mantine/core'

export const runtime = 'experimental-edge'
const inter = Inter({ subsets: ['latin'] })

export default function Home({ state }: { state: MonitorState }) {
  return (
    <>
      <Head>
        <title>{config.page.title}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={inter.className}>
        <Header />

        {
          state === undefined ? 
          (
            <Center>
              <Text fw={700}>
                Monitor State is not defined now, please check your worker&apos;s status and KV binding!
              </Text>
            </Center>
          ) : 
          (
            <div>
              <OverallStatus state={state} />
              <MonitorList config={config} state={state} />
            </div>
          )
        }

        <Divider mt='lg' />
        <Center>
          <Text size='xs' mt='xs' mb='xs'>
            Open-source monitoring and status page powered by <a href='https://github.com/lyc8503/UptimeFlare' target='_blank'>Uptimeflare</a> and <a href='https://www.cloudflare.com/' target='_blank'>Cloudflare</a>, made with ❤ by <a href='https://github.com/lyc8503' target='_blank'>lyc8503</a>.
          </Text>
        </Center>

      </main>
    </>
  )
}


export async function getServerSideProps() {
  const { UPTIMEFLARE_STATE } = process.env as unknown as { UPTIMEFLARE_STATE: KVNamespace }
  const state = await UPTIMEFLARE_STATE?.get('state', 'json') as unknown as MonitorState
  
  return { props: { state } }
}
