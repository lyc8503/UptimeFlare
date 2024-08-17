import { Center, Title } from '@mantine/core'
import { IconCircleCheck, IconAlertCircle } from '@tabler/icons-react'
import { useEffect, useState } from 'react';

function useWindowVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('visibility change', document.visibilityState);
      setIsVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

export default function OverallStatus({
  state,
}: {
  state: { overallUp: number; overallDown: number; lastUpdate: number }
}) {
  let statusString = ''
  let icon = <IconAlertCircle style={{ width: 64, height: 64, color: '#b91c1c' }} />
  if (state.overallUp === 0 && state.overallDown === 0) {
    statusString = '暂无数据'
  } else if (state.overallUp === 0) {
    statusString = '所有系统均未正常运转'
  } else if (state.overallDown === 0) {
    statusString = '所有系统均正常运转'
    icon = <IconCircleCheck style={{ width: 64, height: 64, color: '#059669' }} />
  } else {
    statusString = `部分系统未正常运转（${state.overallDown}个异常，共计${state.overallUp + state.overallDown}个）`
  }

  const [openTime] = useState(Math.round(Date.now() / 1000))
  const [currentTime, setCurrentTime] = useState(Math.round(Date.now() / 1000))
  const isWindowVisible = useWindowVisibility();

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isWindowVisible) {
        return
      }
      if (currentTime - state.lastUpdate > 300 && currentTime - openTime > 30) {
        // trigger a re-fetch
        window.location.reload()
      }
      setCurrentTime(Math.round(Date.now() / 1000))
    }, 1000)

    return () => clearInterval(interval)
  })

  return (
    <>
      <Center>{icon}</Center>
      <Title mt="sm" style={{ textAlign: 'center' }} order={1}>
        {statusString}
      </Title>
      <Title mt="sm" style={{ textAlign: 'center', color: '#70778c' }} order={5}>
        上次更新时间：{' '}
        {`${new Date(state.lastUpdate * 1000).toLocaleString()} （${currentTime - state.lastUpdate} 秒之前）`}
      </Title>
    </>
  )
}
