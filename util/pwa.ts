import { pageConfig } from '@/uptime.config'
import { PageConfigPwaIcon } from '@/types/config'

// Name of the installed app, and the shorter one under its icon
function getPwaNames(): { name: string; shortName: string } {
  const name = pageConfig.pwa?.name ?? pageConfig.title ?? 'UptimeFlare'
  return { name, shortName: pageConfig.pwa?.shortName ?? name }
}

// Icons of the installed app: `pageConfig.pwa.icons`, or else the favicon
function getPwaIcons(): PageConfigPwaIcon[] {
  if (pageConfig.pwa?.icons?.length) return pageConfig.pwa.icons
  if (pageConfig.favicon) return [{ src: pageConfig.favicon, sizes: 'any' }]
  return [{ src: '/favicon.png', sizes: '192x192', type: 'image/png' }]
}

// Title bar color, for the light and the dark theme (the same one if a single color is set)
function getPwaThemeColors(): { light: string; dark: string } | undefined {
  const themeColor = pageConfig.pwa?.themeColor
  if (!themeColor) return undefined
  return typeof themeColor === 'string' ? { light: themeColor, dark: themeColor } : themeColor
}

export { getPwaNames, getPwaIcons, getPwaThemeColors }
