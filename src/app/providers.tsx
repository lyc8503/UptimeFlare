'use client'
import { MantineProvider } from '@mantine/core'
import NoSsr from '@/app/components/NoSsr'
import '@/app/lib/i18n'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NoSsr>
      <MantineProvider defaultColorScheme="auto">{children}</MantineProvider>
    </NoSsr>
  )
}
