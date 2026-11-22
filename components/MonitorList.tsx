import { useState } from 'react'
import { MaintenanceConfig, MonitorState, MonitorTarget } from '@/types/config'
import { pageConfig } from '@/uptime.config'
import { formatPercent, monitorStatus, uptimePercent } from '@/util/status'
import { StatusPill } from './brand'
import UptimeBars from './UptimeBars'
import LatencyChart from './LatencyChart'

function MonitorRow({
  monitor,
  state,
  maintenances,
}: {
  monitor: MonitorTarget
  state: MonitorState
  maintenances: MaintenanceConfig[]
}) {
  const [open, setOpen] = useState(false)
  const status = monitorStatus(state, maintenances, monitor.id)
  const uptime = uptimePercent(state, monitor.id)
  const hasLatency = !monitor.hideLatencyChart && (state.latency[monitor.id]?.length ?? 0) > 0
  const chartId = `chart-${monitor.id}`

  return (
    <li className="st-monitor">
      <div className="st-monitor__head">
        <div className="st-monitor__titles">
          <h3 className="st-monitor__name">
            {monitor.statusPageLink ? <a href={monitor.statusPageLink}>{monitor.name}</a> : monitor.name}
          </h3>
          {monitor.tooltip && <p className="st-monitor__desc">{monitor.tooltip}</p>}
        </div>
        <div className="st-monitor__meta">
          {uptime !== null && (
            <span className="st-monitor__uptime">
              <strong>{formatPercent(uptime)}</strong> uptime
            </span>
          )}
          <StatusPill status={status} />
        </div>
      </div>
      {state.incident[monitor.id] ? (
        <UptimeBars monitor={monitor} state={state} />
      ) : (
        <p className="st-monitor__nodata">No checks have run for this service yet.</p>
      )}
      {hasLatency && (
        <>
          <button
            type="button"
            className="st-disclosure"
            aria-expanded={open}
            aria-controls={chartId}
            onClick={() => setOpen(!open)}
          >
            <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden className={open ? 'is-open' : ''}>
              <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Response times, last 12 hours
          </button>
          {open && (
            <div id={chartId}>
              <LatencyChart monitor={monitor} state={state} />
            </div>
          )}
        </>
      )}
    </li>
  )
}

export default function MonitorList({
  monitors,
  state,
  maintenances,
}: {
  monitors: MonitorTarget[]
  state: MonitorState
  maintenances: MaintenanceConfig[]
}) {
  const group = pageConfig.group
  const groups: [string, MonitorTarget[]][] =
    group && Object.keys(group).length > 0
      ? Object.entries(group).map(([name, ids]) => [
          name,
          ids.map((id) => monitors.find((m) => m.id === id)).filter(Boolean) as MonitorTarget[],
        ])
      : [['Services', monitors]]

  return (
    <div className="st-groups">
      {groups.map(([name, list]) => {
        const ok = list.filter((m) => monitorStatus(state, maintenances, m.id) === 'operational').length
        return (
          <section key={name} className="st-group" aria-labelledby={`g-${name}`}>
            <div className="st-group__head">
              <h2 id={`g-${name}`} className="st-group__name">
                {name}
              </h2>
              <span className="st-group__count">
                {ok} of {list.length} operational
              </span>
            </div>
            <ul className="st-group__list">
              {list.map((m) => (
                <MonitorRow key={m.id} monitor={m} state={state} maintenances={maintenances} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
