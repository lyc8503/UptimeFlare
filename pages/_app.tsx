import type { AppProps } from 'next/app'
import NoSsr from '@/components/NoSsr'
import '@/styles/brand/fonts.css'
import '@/styles/brand/tokens.css'
import '@/styles/brand/bundle.css'
import '@/styles/status.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NoSsr>
      <Component {...pageProps} />
    </NoSsr>
  )
}
