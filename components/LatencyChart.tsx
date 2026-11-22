import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { MonitorState, MonitorTarget } from '@/types/config'
import { codeToCountry } from '@/util/iata'
import { formatTime } from '@/util/status'

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Filler)

// Chart.js draws on a canvas, so read the brand tokens from CSS (and again if the theme changes).
function useTokens() {
  const read = () => {
    const s = getComputedStyle(document.documentElement)
    const v = (n: string) => s.getPropertyValue(n).trim()
    return { moss: v('--moss'), mossSoft: v('--moss-soft'), line: v('--line'), muted: v('--ink-muted'), ink: v('--ink'), raised: v('--paper-raised'), strong: v('--line-strong') }
  }
  const [t, setT] = useState(read)
  useEffect(() => {
    const obs = new MutationObserver(() => setT(read()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return t
}

export default function LatencyChart({ monitor, state }: { monitor: MonitorTarget; state: MonitorState }) {
  const t = useTokens()
  const points = (state.latency[monitor.id] || []).map((p) => ({ x: p.time, y: p.ping, loc: p.loc }))
  const font = { family: getComputedStyle(document.body).fontFamily, size: 12 }

  return (
    <div className="st-chart">
      <Line
        aria-label={`Response times for ${monitor.name} over the last 12 hours`}
        role="img"
        data={{
          datasets: [
            {
              data: points,
              borderColor: t.moss,
              backgroundColor: t.mossSoft,
              fill: 'origin',
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 3,
              cubicInterpolationMode: 'monotone',
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: t.raised,
              titleColor: t.ink,
              bodyColor: t.muted,
              borderColor: t.strong,
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              titleFont: { ...font, weight: 'bold' },
              bodyFont: font,
              callbacks: {
                title: (items) => formatTime(items[0].parsed.x as number),
                label: (item) => `${item.parsed.y} ms from ${codeToCountry((item.raw as any).loc)}`,
              },
            },
          },
          scales: {
            x: {
              type: 'linear',
              min: points[0]?.x,
              max: points[points.length - 1]?.x,
              border: { display: false },
              grid: { display: false },
              ticks: { color: t.muted, font, maxTicksLimit: 7, callback: (v) => formatTime(Number(v)) },
            },
            y: {
              beginAtZero: true,
              border: { display: false },
              grid: { color: t.line },
              ticks: { color: t.muted, font, maxTicksLimit: 4, callback: (v) => `${v} ms` },
            },
          },
        }}
      />
    </div>
  )
}
