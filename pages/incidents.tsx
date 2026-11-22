import Head from 'next/head'
import { useEffect, useState } from 'react'
import { MaintenanceConfig, MonitorTarget } from '@/types/config'
import { maintenances as configMaintenances, pageConfig } from '@/uptime.config'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Notice from '@/components/Notice'
import { EmptyState } from '@/components/brand'

export const runtime = 'experimental-edge'

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

function selectedMonth() {
  const hash = window.location.hash.replace('#', '')
  return /^\d{4}-\d{2}$/.test(hash) ? hash : monthKey(new Date())
}

function shift(month: string, by: number) {
  const [y, m] = month.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + by))
}

function monthName(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function Incidents({
  monitors,
  maintenances,
}: {
  monitors: MonitorTarget[]
  maintenances: MaintenanceConfig[]
}) {
  const [month, setMonth] = useState(selectedMonth)
  const [service, setService] = useState('')

  useEffect(() => {
    const onHash = () => setMonth(selectedMonth())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const list = maintenances
    .filter((n) => monthKey(new Date(n.start)) === month)
    .filter((n) => !service || n.monitors?.includes(service))
    .sort((a, b) => +new Date(b.start) - +new Date(a.start))
  const isCurrentMonth = month === monthKey(new Date())

  return (
    <>
      <Head>
        <title>{`Incident history · ${pageConfig.title}`}</title>
      </Head>
      <Header current="incidents" />
      <main className="st-main">
        <div className="st-container st-container--narrow">
          <div className="st-pagehead">
            <h1 className="ct-h1">Incident history</h1>
            <p className="ct-lede">
              Every incident update and planned maintenance we&rsquo;ve posted, by month.
            </p>
          </div>

          <div className="st-toolbar">
            <div className="st-monthnav">
              <a className="ct-btn ct-btn--secondary ct-btn--sm" href={`#${shift(month, -1)}`} aria-label="Previous month">
                <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden>
                  <path d="M10 4 6 8l4 4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <h2 className="st-monthnav__label" aria-live="polite">
                {monthName(month)}
              </h2>
              <a
                className={`ct-btn ct-btn--secondary ct-btn--sm${isCurrentMonth ? ' is-disabled' : ''}`}
                href={isCurrentMonth ? undefined : `#${shift(month, 1)}`}
                aria-label="Next month"
                aria-disabled={isCurrentMonth}
              >
                <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden>
                  <path d="m6 4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
            <label className="st-select">
              <span className="st-visually-hidden">Service</span>
              <select value={service} onChange={(e) => setService(e.target.value)}>
                <option value="">All services</option>
                {monitors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {list.length === 0 ? (
            <EmptyState title={`Nothing to report for ${monthName(month)}`}>
              We post here whenever something affects Cottage, and before planned maintenance.
              Short blips our checks caught show on each service&rsquo;s uptime bars.
            </EmptyState>
          ) : (
            <div className="st-notices">
              {list.map((n, i) => (
                <Notice key={i} notice={n} monitors={monitors} upcoming={new Date(n.start) > new Date()} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

export async function getServerSideProps({ query }: { query: Record<string, string | string[] | undefined> }) {
  const { workerConfig } = await import('@/uptime.config')
  const monitors = workerConfig.monitors.map((m) => ({ id: m.id, name: m.name }))
  if (process.env.NODE_ENV === 'development' && !(process.env as any).UPTIMEFLARE_D1) {
    const { sampleNotices } = await import('@/dev/sample')
    return { props: { monitors, maintenances: sampleNotices(String(query.sample ?? '')) } }
  }
  return { props: { monitors, maintenances: configMaintenances } }
}
