import Head from 'next/head'
import { Inter } from 'next/font/google'
import Header from './Header'
import { Container, Divider, Text } from '@mantine/core'
import { pageConfig } from '@/uptime.config'

const inter = Inter({ subsets: ['latin'] })

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head>
        <title>{pageConfig.title}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={inter.className}>
        <Header />
        <Container size="md" mt="xl">
          {children}
        </Container>

        <Divider mt="lg" />
        <Text
          size="xs"
          mt="xs"
          mb="xs"
          style={{
            textAlign: 'center',
          }}
          className="footer"
        >
          Open-source monitoring and status page powered by{' '}
          <a href="https://github.com/lyc8503/UptimeFlare" target="_blank">
            Uptimeflare
          </a>{' '}
          and{' '}
          <a href="https://www.cloudflare.com/" target="_blank">
            Cloudflare
          </a>
          , made with ❤ by{' '}
          <a href="https://github.com/lyc8503" target="_blank">
            lyc8503
          </a>
          .
        </Text>
      </main>
    </>
  )
}
