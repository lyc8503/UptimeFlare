import { Html, Head, Main, NextScript } from 'next/document'
import { ColorSchemeScript } from '@mantine/core'
import { pageConfig } from '@/uptime.config'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <ColorSchemeScript defaultColorScheme={pageConfig.colorScheme ?? 'auto'} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
