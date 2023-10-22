
import { Text } from "@mantine/core"
import { MonitorState, MonitorTarget } from "@/uptime.types"
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react"
import DetailChart from "./DetailChart"
import DetailBar from "./DetailBar"

function getColor(percent: number | string, darker: boolean): string {
  percent = Number(percent)
  if (percent >= 99.9) {
    return darker ? '#059669' : '#3bd671'
  } else if (percent >= 99) {
    return darker ? '#3bd671' : '#9deab8'
  } else if (percent >= 95) {
    return '#f29030'
  } else {
    return '#df484a'
  }
}

export default function MonitorDetail({ monitor, state }: { monitor: MonitorTarget, state: MonitorState }) {

  if (!state.latency[monitor.id]) return (
    <>
      <Text>{monitor.name}</Text>
      <Text>No data available, please make sure you have deployed your workers with latest config and check your worker status!</Text>
    </>
  )

  const statusIcon = state.incident[monitor.id].slice(-1)[0].end === undefined ? <IconAlertCircle style={{ width: '1em', height: '1em', color: '#b91c1c' }} /> : <IconCircleCheck style={{ width: '1em', height: '1em', color: '#059669' }} />

  let totalTime = Date.now() / 1000 - state.incident[monitor.id][0].start[0]
  let downTime = 0
  for (let incident of state.incident[monitor.id]) {
    downTime += (incident.end ?? (Date.now() / 1000)) - incident.start[0]
  }

  console.log(totalTime)
  console.log(downTime)
  const uptimePercent = ((totalTime - downTime) / totalTime * 100).toPrecision(4)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Text mt='sm' style={{ display: 'inline-flex', alignItems: 'center' }}>{statusIcon} {monitor.name}</Text>
        <Text mt='sm' fw={700} style={{ display: 'inline', color: getColor(uptimePercent, true) }}>Overall: {uptimePercent}%</Text>
      </div>

      <DetailBar monitor={monitor} state={state} />
      <DetailChart monitor={monitor} state={state} />
    </>
  )
}