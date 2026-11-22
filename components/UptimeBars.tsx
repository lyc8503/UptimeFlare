import { useRef, useState } from 'react'
import { MonitorState, MonitorTarget } from '@/types/config'
import { Day, DAYS, dailyHistory, dayTone, formatDate, formatDuration, formatPercent, formatTime } from '@/util/status'

// 90 daily bars. Each bar is a button: hover or focus shows the day, and arrow keys move
// between days, so the history isn't colour-only or mouse-only.
export default function UptimeBars({ monitor, state }: { monitor: MonitorTarget; state: MonitorState }) {
  const days = dailyHistory(state, monitor.id)
  const [active, setActive] = useState<{ i: number; side: React.CSSProperties } | null>(null)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const badDays = days.filter((d) => d.downSeconds > 0).length

  // anchor the card to the bar, opening away from the nearer edge
  const show = (i: number, el: HTMLElement) => {
    const row = el.parentElement!.getBoundingClientRect()
    const bar = el.getBoundingClientRect()
    const x = bar.left - row.left
    setActive({ i, side: x < row.width / 2 ? { left: x } : { right: row.right - bar.right } })
  }

  const move = (i: number) => {
    const j = Math.max(0, Math.min(DAYS - 1, i))
    const el = refs.current[j]
    // on phones the oldest 60 bars are hidden: don't move focus onto them
    if (el && el.offsetParent !== null) el.focus()
  }

  return (
    <div className="st-bars-wrap">
      <div
        className="st-bars"
        role="group"
        aria-label={`${monitor.name}, last ${DAYS} days: ${badDays === 0 ? 'no downtime' : `downtime on ${badDays} day${badDays === 1 ? '' : 's'}`}`}
        onMouseLeave={() => setActive(null)}
      >
        {days.map((d, i) => (
          <button
            key={d.start}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            className={`st-bar st-bar--${dayTone(d)}`}
            aria-label={dayLabel(d)}
            tabIndex={i === DAYS - 1 ? 0 : -1}
            onMouseEnter={(e) => show(i, e.currentTarget)}
            onFocus={(e) => show(i, e.currentTarget)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') move(i - 1)
              else if (e.key === 'ArrowRight') move(i + 1)
              else if (e.key === 'Home') move(0)
              else if (e.key === 'End') move(DAYS - 1)
              else return
              e.preventDefault()
            }}
          />
        ))}
        {active !== null && <DayCard day={days[active.i]} side={active.side} />}
      </div>
      <div className="st-bars__axis" aria-hidden>
        <span className="st-bars__from--long">{DAYS} days ago</span>
        <span className="st-bars__from--short">30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  )
}

function dayLabel(d: Day) {
  const date = formatDate(d.start, true)
  if (d.percent === null) return `${date}: not monitored yet`
  if (d.downSeconds === 0) return `${date}: no downtime`
  return `${date}: down for ${formatDuration(d.downSeconds)}, ${formatPercent(d.percent)} up`
}

function DayCard({ day, side }: { day: Day; side: React.CSSProperties }) {
  return (
    <div className="st-daycard" style={side} role="status">
      <p className="st-daycard__date">{formatDate(day.start, true)}</p>
      {day.percent === null ? (
        <p className="st-daycard__line">Not monitored yet</p>
      ) : day.downSeconds === 0 ? (
        <p className="st-daycard__line">No downtime</p>
      ) : (
        <>
          <p className="st-daycard__line">
            Down for {formatDuration(day.downSeconds)} · {formatPercent(day.percent)} up
          </p>
          <ul className="st-daycard__events">
            {day.events.slice(0, 4).map((ev, i) => (
              <li key={i}>
                <span className="ct-mono st-daycard__time">
                  {formatTime(ev.from)}–{formatTime(ev.to)}
                </span>{' '}
                {ev.error}
              </li>
            ))}
            {day.events.length > 4 && <li>and {day.events.length - 4} more</li>}
          </ul>
        </>
      )}
    </div>
  )
}
