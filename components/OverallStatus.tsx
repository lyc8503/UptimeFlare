import { useEffect, useState } from 'react'
import { MaintenanceConfig, MonitorState, MonitorTarget } from '@/types/config'
import { activeNotices, overallSummary, upcomingNotices } from '@/util/status'
import { PodRow, StatusIcon } from './brand'
import Notice from './Notice'

function useNow() {
  const [now, setNow] = useState(() => Math.round(Date.now() / 1000))
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') setNow(Math.round(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function ago(seconds: number) {
  if (seconds < 5) return 'just now'
  if (seconds < 90) return `${seconds} seconds ago`
  return `${Math.round(seconds / 60)} minutes ago`
}

export default function OverallStatus({
  state,
  monitors,
  maintenances,
}: {
  state: MonitorState
  monitors: MonitorTarget[]
  maintenances: MaintenanceConfig[]
}) {
  const now = useNow()
  const [openedAt] = useState(now)
  const [showUpcoming, setShowUpcoming] = useState(false)

  // Reload when the data is more than five minutes old (the worker writes every minute).
  useEffect(() => {
    if (state.lastUpdate > 0 && now - state.lastUpdate > 300 && now - openedAt > 30) {
      window.location.reload()
    }
  }, [now, state.lastUpdate, openedAt])

  const summary = overallSummary(state, monitors, maintenances)
  const active = activeNotices(maintenances)
  const upcoming = upcomingNotices(maintenances)
  const shape = summary.tone === 'success' ? 'dot' : summary.tone === 'neutral' ? 'ring' : summary.title.startsWith('Maintenance') ? 'spin' : 'tri'

  return (
    <section className="st-hero" aria-labelledby="st-summary">
      <PodRow count={5} size={28} />
      <h1 id="st-summary" className="ct-h1 st-hero__title">
        <span className={`st-hero__icon st-tone--${summary.tone}`}>
          <StatusIcon shape={shape} />
        </span>
        {summary.title}
      </h1>
      <p className="st-hero__lede">
        {state.lastUpdate > 0 ? (
          <>
            Last checked {ago(now - state.lastUpdate)}
            <span className="st-hero__sep" aria-hidden>
              ·
            </span>
            checks run every minute
          </>
        ) : (
          'The first checks run within a minute of deploying.'
        )}
      </p>

      {active.length > 0 && (
        <div className="st-notices">
          {active.map((n, i) => (
            <Notice key={`a${i}`} notice={n} monitors={monitors} />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="st-upcoming">
          <button
            type="button"
            className="ct-btn ct-btn--quiet ct-btn--sm"
            aria-expanded={showUpcoming}
            onClick={() => setShowUpcoming(!showUpcoming)}
          >
            {showUpcoming ? 'Hide' : 'Show'} planned maintenance ({upcoming.length})
          </button>
          {showUpcoming && (
            <div className="st-notices">
              {upcoming.map((n, i) => (
                <Notice key={`u${i}`} notice={n} monitors={monitors} upcoming />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
