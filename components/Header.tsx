import { Container, Group, Image, Text } from '@mantine/core'
import classes from '@/styles/Header.module.css'
import { pageConfig } from '@/uptime.config'
import { PageConfigLink } from '@/types/config'
import { useTranslation } from 'react-i18next'

export default function Header({ style }: { style?: React.CSSProperties }) {
  const { t } = useTranslation('common')
  const linkToElement = (link: PageConfigLink, i: number) => {
    return (
      <a
        key={i}
        href={link.link}
        target={link.link.startsWith('/') ? undefined : '_blank'}
        className={classes.link}
        data-active={link.highlight}
      >
        {link.label}
      </a>
    )
  }

  const links = [
    ...(pageConfig.incidents !== false ? [{ label: t('Incidents'), link: '/incidents' }] : []),
    ...(pageConfig.links || []),
  ]

  const logoHref =
    location.pathname == '/' ? pageConfig.logoLink ?? 'https://github.com/lyc8503/UptimeFlare' : '/'

  return (
    <header className={classes.header} style={style}>
      <Container size="md" className={classes.inner}>
        <Group gap="xs" wrap="nowrap">
          <a
            href={logoHref}
            target={location.pathname == '/' ? '_blank' : undefined}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <Image
              src={pageConfig.logo ?? '/logo.svg'}
              h={56}
              p={2}
              fit="contain"
              alt="logo"
            />
          </a>
          {pageConfig.showTitle && pageConfig.title && (
            <Text fw={600} size="lg" lineClamp={1}>
              {pageConfig.title}
            </Text>
          )}
        </Group>

        <Group gap={5} visibleFrom="sm">
          {links?.map(linkToElement)}
        </Group>

        <Group gap={5} hiddenFrom="sm">
          {links?.filter((link) => link.highlight || link.link.startsWith('/')).map(linkToElement)}
        </Group>
      </Container>
    </header>
  )
}
