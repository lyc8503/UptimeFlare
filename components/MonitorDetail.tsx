
import { Line } from "react-chartjs-2"
import { Text } from "@mantine/core"
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js'
import { MonitorState, MonitorTarget } from "@/uptime.types";
import 'chartjs-adapter-moment'
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)


export default function MonitorDetail({ monitor, state }: { monitor: MonitorTarget, state: MonitorState }) {

  if (!state.latency[monitor.id]) return (
    <>
      <Text>{monitor.name}</Text>
      <Text>No data available, please make sure you have deployed your workers with latest config and check your worker status!</Text>
    </>
  )

  const statusIcon = (state.incident[monitor.id].slice(-1)[0] ?? { end: 'dummy' }).end === undefined ? <IconAlertCircle style={{ width: '1em', height: '1em', color: '#b91c1c' }} /> : <IconCircleCheck style={{ width: '1em', height: '1em', color: '#059669' }} />

  const latencyData = state.latency[monitor.id].recent.map((point) => ({ x: point.time * 1000, y: point.ping, loc: point.loc }))

  let data = {
    datasets: [
      {
        data: latencyData,
        borderColor: 'rgb(112, 119, 140)',
        borderWidth: 2,
        radius: 0,
        cubicInterpolationMode: 'monotone' as const,
        tension: 0.4
      }
    ]
  }
  
  let options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (item: any) => {
            if (item.parsed.y) {
              return `${item.parsed.y}ms (${item.raw.loc})`
            }
          }
        }
      },
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Response times(ms)',
        align: 'start' as const
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        ticks: {
          source: 'auto' as const,
          maxRotation: 0,
          autoSkip: true
        }
      }
    }
  }

  return (
    <>
      <Text mt='sm' style={{ display: 'flex', alignItems: 'center' }}>{statusIcon} {monitor.name}</Text>
      <div style={{ height: '150px' }}>
        <Line options={options} data={data} />
      </div>
    </>
  )
}