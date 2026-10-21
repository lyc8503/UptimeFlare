import { pageConfig } from '@/uptime.config'
import { getPwaIcons, getPwaNames, getPwaThemeColors } from '@/util/pwa'

export const runtime = 'edge'

// Web app manifest, which makes the status page installable as an app (PWA)
export default async function handler(): Promise<Response> {
  const { name, shortName } = getPwaNames()

  const manifest = {
    name,
    short_name: shortName,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: getPwaThemeColors()?.light,
    background_color: pageConfig.pwa?.backgroundColor,
    icons: getPwaIcons(),
  }

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json' },
  })
}
