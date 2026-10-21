import { Html, Head, Main, NextScript } from 'next/document'
import { ColorSchemeScript } from '@mantine/core'
import { getPwaIcons, getPwaNames, getPwaThemeColors } from '@/util/pwa'

export default function Document() {
  const themeColors = getPwaThemeColors()

  return (
    <Html lang="en">
      <Head>
        <ColorSchemeScript defaultColorScheme="auto" />
        {/* Credentials are needed to fetch the manifest when password protection is enabled */}
        <link rel="manifest" href="/api/manifest" crossOrigin="use-credentials" />
        {/* iOS doesn't use the manifest icons for the home screen */}
        <link rel="apple-touch-icon" href={getPwaIcons()[0].src} />
        <meta name="apple-mobile-web-app-title" content={getPwaNames().shortName} />
        {themeColors && (
          <>
            <meta
              name="theme-color"
              media="(prefers-color-scheme: light)"
              content={themeColors.light}
            />
            <meta
              name="theme-color"
              media="(prefers-color-scheme: dark)"
              content={themeColors.dark}
            />
          </>
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
