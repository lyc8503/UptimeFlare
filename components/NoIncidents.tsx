import { Alert, Text } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

export default function NoIncidentsAlert({ style }: { style?: React.CSSProperties }) {
  const { t } = useTranslation('common')
  return (
    <Alert
      icon={<IconInfoCircle />}
      title={
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 700,
          }}
        >
          {t('No incidents in this month')}
        </span>
      }
      color="gray"
      withCloseButton={false}
      style={{
        position: 'relative',
        margin: '16px auto 0 auto',
        ...style,
      }}
    >
      <Text>{t('There are no incidents for this month')}</Text>
    </Alert>
  )
}
