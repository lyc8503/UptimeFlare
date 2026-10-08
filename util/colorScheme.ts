import { PageConfig } from '@/types/config'

type ComputedColorScheme = 'light' | 'dark'

export function getLogo(pageConfig: PageConfig, colorScheme: ComputedColorScheme) {
  return colorScheme === 'dark'
    ? pageConfig.darkLogo ?? pageConfig.logo ?? '/logo.svg'
    : pageConfig.logo ?? '/logo.svg'
}

export function getFavicon(pageConfig: PageConfig, colorScheme: ComputedColorScheme) {
  return colorScheme === 'dark'
    ? pageConfig.darkFavicon ?? pageConfig.favicon ?? '/favicon.png'
    : pageConfig.favicon ?? '/favicon.png'
}
