import { MonitorState, MonitorTarget } from "@/uptime.types";
import { Tooltip } from "@mantine/core";


export default function DetailBar({ monitor, state }: { monitor: MonitorTarget, state: MonitorState }) {  
  // const day = new Date()
  // day.setHours(0, 0, 0, 0)
  // const dayStart = day.getTime()

  const overlapLen = (x1: number, x2: number, y1: number, y2: number) => {
    return Math.max(0, Math.min(x2, y2) - Math.max(x1, y1) + 1)
  }

  const uptimePercentBars = []
  
  for (let i = 89; i > 0; i--) {

    let dayDownTime = 0
    let dayTotalTime = 0

    // if (state.incident[monitor.id][0].end)

    uptimePercentBars.push(
      <Tooltip key={i} label="Tooltip">
        <div style={{ height: '20px', width: '0.8%', background: 'green', borderRadius: '2px', marginLeft: '0.155%', marginRight: '0.155%' }}/>
      </Tooltip>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'nowrap', marginTop: '10px', marginBottom: '5px' }}>
      {uptimePercentBars}
    </div>
  )
}