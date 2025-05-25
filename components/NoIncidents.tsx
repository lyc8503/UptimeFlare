import { Alert, Text } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'

export default function NoIncidentsAlert({ style }: { style?: React.CSSProperties }) {
  return (
    <Alert
      icon={<IconInfoCircle />}
      title="No Incidents in this month"
      color="gray"
      withCloseButton={false}
      style={{
        position: 'relative',
        margin: '16px auto 0 auto',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          fontSize: '0.85rem',
          textAlign: 'right',
          padding: '2px 8px',
          borderRadius: 6,
          color: '#888',
        }}
      ></div>
      <Text>There are no incidents for this month.</Text>
    </Alert>
  )
}
