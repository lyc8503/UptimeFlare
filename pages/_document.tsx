import { Html, Head, Main, NextScript } from 'next/document'

// Cottage is light-first; dark ("evening") follows the OS setting. The tokens switch on
// data-theme, set here before first paint so there's no flash.
const themeScript = `(function(){var m=window.matchMedia('(prefers-color-scheme: dark)');function s(){document.documentElement.setAttribute('data-theme',m.matches?'dark':'light')}s();m.addEventListener('change',s)})()`

export default function Document() {
  return (
    <Html lang="en" data-theme="light">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preload" href="/fonts/HankenGrotesk-400-700.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Fraunces-400-700.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="color-scheme" content="light dark" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
