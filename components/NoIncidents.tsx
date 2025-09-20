import { Alert, Text } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'

export default function NoIncidentsAlert({ style }: { style?: React.CSSProperties }) {
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
          {'No incidents in this month'}
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
      <Text>There are no incidents for this month.</Text>
    </Alert>
  )
}
